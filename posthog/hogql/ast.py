import re
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Extra
from pydantic import Field as PydanticField

from posthog.hogql.database import (
    DatabaseField,
    FieldTraverser,
    LazyJoin,
    StringJSONDatabaseField,
    Table,
    VirtualTable,
    LazyTable,
)
from posthog.hogql.errors import HogQLException, NotImplementedException

# NOTE: when you add new AST fields or nodes, add them to the Visitor classes in visitor.py as well!

camel_case_pattern = re.compile(r"(?<!^)(?=[A-Z])")


class AST(BaseModel):
    class Config:
        extra = Extra.forbid

    def accept(self, visitor):
        camel_case_name = camel_case_pattern.sub("_", self.__class__.__name__).lower()
        method_name = f"visit_{camel_case_name}"
        if hasattr(visitor, method_name):
            visit = getattr(visitor, method_name)
            return visit(self)
        if hasattr(visitor, "visit_unknown"):
            return visitor.visit_unknown(self)
        raise NotImplementedException(f"Visitor has no method {method_name}")


class Type(AST):
    def get_child(self, name: str) -> "Type":
        raise NotImplementedException("Type.get_child not overridden")

    def has_child(self, name: str) -> bool:
        return self.get_child(name) is not None


class Expr(AST):
    type: Optional[Type]


class Macro(Expr):
    name: str
    expr: Expr
    # Whether the macro is an inlined column "SELECT 1 AS a" or a subquery "SELECT a AS (SELECT 1)"
    macro_type: Literal["column", "subquery"]


class FieldAliasType(Type):
    name: str
    type: Type

    def get_child(self, name: str) -> Type:
        return self.type.get_child(name)

    def has_child(self, name: str) -> bool:
        return self.type.has_child(name)


class BaseTableType(Type):
    def resolve_database_table(self) -> Table:
        raise NotImplementedException("BaseTableType.resolve_database_table not overridden")

    def has_child(self, name: str) -> bool:
        return self.resolve_database_table().has_field(name)

    def get_child(self, name: str) -> Type:
        if name == "*":
            return AsteriskType(table=self)
        if self.has_child(name):
            field = self.resolve_database_table().get_field(name)
            if isinstance(field, LazyJoin):
                return LazyJoinType(table=self, field=name, lazy_join=field)
            if isinstance(field, LazyTable):
                return LazyTableType(table=field)
            if isinstance(field, FieldTraverser):
                return FieldTraverserType(table=self, chain=field.chain)
            if isinstance(field, VirtualTable):
                return VirtualTableType(table=self, field=name, virtual_table=field)
            return FieldType(name=name, table=self)
        raise HogQLException(f"Field not found: {name}")


class TableType(BaseTableType):
    table: Table

    def resolve_database_table(self) -> Table:
        return self.table


class TableAliasType(BaseTableType):
    name: str
    table_type: TableType

    def resolve_database_table(self) -> Table:
        return self.table_type.table


class LazyJoinType(BaseTableType):
    table: BaseTableType
    field: str
    lazy_join: LazyJoin

    def resolve_database_table(self) -> Table:
        return self.lazy_join.join_table


class LazyTableType(BaseTableType):
    table: LazyTable

    def resolve_database_table(self) -> Table:
        return self.table


class VirtualTableType(BaseTableType):
    table: BaseTableType
    field: str
    virtual_table: VirtualTable

    def resolve_database_table(self) -> Table:
        return self.virtual_table

    def has_child(self, name: str) -> bool:
        return self.virtual_table.has_field(name)


class SelectQueryType(Type):
    """Type and new enclosed scope for a select query. Contains information about all tables and columns in the query."""

    # all aliases a select query has access to in its scope
    aliases: Dict[str, FieldAliasType] = PydanticField(default_factory=dict)
    # all types a select query exports
    columns: Dict[str, Type] = PydanticField(default_factory=dict)
    # all from and join, tables and subqueries with aliases
    tables: Dict[
        str, Union[BaseTableType, "SelectUnionQueryType", "SelectQueryType", "SelectQueryAliasType"]
    ] = PydanticField(default_factory=dict)
    macros: Dict[str, Macro] = PydanticField(default_factory=dict)
    # all from and join subqueries without aliases
    anonymous_tables: List[Union["SelectQueryType", "SelectUnionQueryType"]] = PydanticField(default_factory=list)

    def get_alias_for_table_type(
        self,
        table_type: Union[BaseTableType, "SelectUnionQueryType", "SelectQueryType", "SelectQueryAliasType"],
    ) -> Optional[str]:
        for key, value in self.tables.items():
            if value == table_type:
                return key
        return None

    def get_child(self, name: str) -> Type:
        if name == "*":
            return AsteriskType(table=self)
        if name in self.columns:
            return FieldType(name=name, table=self)
        raise HogQLException(f"Column not found: {name}")

    def has_child(self, name: str) -> bool:
        return name in self.columns


class SelectUnionQueryType(Type):
    types: List[SelectQueryType]

    def get_alias_for_table_type(
        self,
        table_type: Union[BaseTableType, SelectQueryType, "SelectQueryAliasType"],
    ) -> Optional[str]:
        return self.types[0].get_alias_for_table_type(table_type)

    def get_child(self, name: str) -> Type:
        return self.types[0].get_child(name)

    def has_child(self, name: str) -> bool:
        return self.types[0].has_child(name)


class SelectQueryAliasType(Type):
    name: str
    type: SelectQueryType | SelectUnionQueryType

    def get_child(self, name: str) -> Type:
        if name == "*":
            return AsteriskType(table=self)
        if self.type.has_child(name):
            return FieldType(name=name, table=self)
        raise HogQLException(f"Field {name} not found on query with alias {self.name}")

    def has_child(self, name: str) -> bool:
        return self.type.has_child(name)


SelectQueryType.update_forward_refs(SelectQueryAliasType=SelectQueryAliasType)


class CallType(Type):
    name: str
    args: List[Type]


class ConstantType(Type):
    type: Literal["int", "float", "str", "bool", "unknown"]


class AsteriskType(Type):
    table: BaseTableType | SelectQueryType | SelectQueryAliasType | SelectUnionQueryType


class FieldTraverserType(Type):
    chain: List[str]
    table: BaseTableType | SelectQueryType | SelectQueryAliasType | SelectUnionQueryType


class FieldType(Type):
    name: str
    table: BaseTableType | SelectQueryType | SelectQueryAliasType | SelectUnionQueryType

    def resolve_database_field(self) -> Optional[DatabaseField]:
        if isinstance(self.table, BaseTableType):
            table = self.table.resolve_database_table()
            if table is not None:
                return table.get_field(self.name)
        return None

    def get_child(self, name: str) -> Type:
        database_field = self.resolve_database_field()
        if database_field is None:
            raise HogQLException(f'Can not access property "{name}" on field "{self.name}".')
        if isinstance(database_field, StringJSONDatabaseField):
            return PropertyType(chain=[name], parent=self)
        raise HogQLException(
            f'Can not access property "{name}" on field "{self.name}" of type: {type(database_field).__name__}'
        )


class PropertyType(Type):
    chain: List[str]
    parent: FieldType

    # The property has been moved into a field we query from a joined subquery
    joined_subquery: Optional[SelectQueryAliasType]
    joined_subquery_field_name: Optional[str]

    def get_child(self, name: str) -> "Type":
        return PropertyType(chain=self.chain + [name], parent=self.parent)

    def has_child(self, name: str) -> bool:
        return True


class LambdaArgumentType(Type):
    name: str


class Alias(Expr):
    alias: str
    expr: Expr


class BinaryOperationType(str, Enum):
    Add = "+"
    Sub = "-"
    Mult = "*"
    Div = "/"
    Mod = "%"


class BinaryOperation(Expr):
    left: Expr
    right: Expr
    op: BinaryOperationType


class And(Expr):
    class Config:
        extra = Extra.forbid

    exprs: List[Expr]


class Or(Expr):
    class Config:
        extra = Extra.forbid

    exprs: List[Expr]


class CompareOperationType(str, Enum):
    Eq = "=="
    NotEq = "!="
    Gt = ">"
    GtE = ">="
    Lt = "<"
    LtE = "<="
    Like = "like"
    ILike = "ilike"
    NotLike = "not like"
    NotILike = "not ilike"
    In = "in"
    NotIn = "not in"
    Regex = "=~"
    NotRegex = "!~"


class CompareOperation(Expr):
    left: Expr
    right: Expr
    op: CompareOperationType


class Not(Expr):
    expr: Expr


class OrderExpr(Expr):
    expr: Expr
    order: Literal["ASC", "DESC"] = "ASC"


class ArrayAccess(Expr):
    array: Expr
    property: Expr


class Array(Expr):
    exprs: List[Expr]


class Tuple(Expr):
    exprs: List[Expr]


class Lambda(Expr):
    args: List[str]
    expr: Expr


class Constant(Expr):
    value: Any


class Field(Expr):
    chain: List[str]


class Placeholder(Expr):
    field: str


class Call(Expr):
    name: str
    args: List[Expr]
    distinct: Optional[bool] = None


class JoinExpr(Expr):
    type: Optional[BaseTableType | SelectQueryType | SelectQueryAliasType | SelectUnionQueryType]

    join_type: Optional[str] = None
    table: Optional[Union["SelectQuery", "SelectUnionQuery", Field]] = None
    alias: Optional[str] = None
    table_final: Optional[bool] = None
    constraint: Optional[Expr] = None
    next_join: Optional["JoinExpr"] = None
    sample: Optional["SampleExpr"] = None


class SelectQuery(Expr):
    type: Optional[SelectQueryType] = None
    macros: Optional[Dict[str, Macro]] = None
    select: List[Expr]
    distinct: Optional[bool] = None
    select_from: Optional[JoinExpr] = None
    where: Optional[Expr] = None
    prewhere: Optional[Expr] = None
    having: Optional[Expr] = None
    group_by: Optional[List[Expr]] = None
    order_by: Optional[List[OrderExpr]] = None
    limit: Optional[Expr] = None
    limit_by: Optional[List[Expr]] = None
    limit_with_ties: Optional[bool] = None
    offset: Optional[Expr] = None


class SelectUnionQuery(Expr):
    type: Optional[SelectUnionQueryType] = None
    select_queries: List[SelectQuery]


class RatioExpr(Expr):
    left: Constant
    right: Optional[Constant] = None


class SampleExpr(Expr):
    # k or n
    sample_value: RatioExpr
    offset_value: Optional[RatioExpr]


JoinExpr.update_forward_refs(SampleExpr=SampleExpr)
JoinExpr.update_forward_refs(SelectUnionQuery=SelectUnionQuery)
JoinExpr.update_forward_refs(SelectQuery=SelectQuery)
