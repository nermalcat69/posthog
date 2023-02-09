import re
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Extra

from posthog.hogql.constants import EVENT_FIELDS

# NOTE: when you add new AST fields or nodes, add them to CloningVisitor as well!

camel_case_pattern = re.compile(r"(?<!^)(?=[A-Z])")


class AST(BaseModel):
    class Config:
        extra = Extra.forbid

    def accept(self, visitor):
        camel_case_name = camel_case_pattern.sub("_", self.__class__.__name__).lower()
        method_name = "visit_{}".format(camel_case_name)
        visit = getattr(visitor, method_name)
        return visit(self)


class Symbol(AST):
    name: str

    def get_child(self, name: str) -> "Symbol":
        raise NotImplementedError()

    def has_child(self, name: str) -> bool:
        return self.get_child(name) is not None


class AliasSymbol(Symbol):
    symbol: "Symbol"


class TableSymbol(Symbol):
    table_name: Literal["events"]

    def has_child(self, name: str) -> bool:
        if self.table_name == "events":
            return name in EVENT_FIELDS
        else:
            raise NotImplementedError(f"Can not resolve table: {self.name}")

    def get_child(self, name: str) -> "Symbol":
        if self.table_name == "events":
            if name in EVENT_FIELDS:
                return FieldSymbol(name=name, table=self)
        else:
            raise NotImplementedError(f"Can not resolve table: {self.name}")


class SelectQuerySymbol(Symbol):
    symbols: Dict[str, Symbol]
    tables: Dict[str, Symbol]

    def get_child(self, name: str) -> "Symbol":
        if name in self.symbols:
            return self.symbols[name]
        if name in self.tables:
            return self.tables[name]

    def has_child(self, name: str) -> bool:
        return name in self.symbols or name in self.tables


class FieldSymbol(Symbol):
    table: TableSymbol

    def get_child(self, name: str) -> "Symbol":
        if self.table.table_name == "events":
            if self.name == "properties":
                raise NotImplementedError(f"Property symbol resolution not implemented yet")
            else:
                raise NotImplementedError(f"Can not resolve field {self.name} on table events")
        else:
            raise NotImplementedError(f"Can not resolve fields on table: {self.name}")


class PropertySymbol(Symbol):
    field: FieldSymbol


class Expr(AST):
    symbol: Optional[Symbol]


Symbol.update_forward_refs(Expr=Expr)
AliasSymbol.update_forward_refs(Expr=Expr)
SelectQuerySymbol.update_forward_refs(Expr=Expr)


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


class CompareOperation(Expr):
    left: Expr
    right: Expr
    op: CompareOperationType


class Not(Expr):
    expr: Expr


class OrderExpr(Expr):
    expr: Expr
    order: Literal["ASC", "DESC"] = "ASC"


class Constant(Expr):
    value: Any


class Field(Expr):
    chain: List[str]


class Placeholder(Expr):
    field: str


class Call(Expr):
    name: str
    args: List[Expr]


class JoinExpr(Expr):
    table: Optional[Union["SelectQuery", Field]] = None
    table_final: Optional[bool] = None
    alias: Optional[str] = None
    join_type: Optional[str] = None
    join_constraint: Optional[Expr] = None
    join_expr: Optional["JoinExpr"] = None


class SelectQuery(Expr):
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


JoinExpr.update_forward_refs(SelectQuery=SelectQuery)
JoinExpr.update_forward_refs(JoinExpr=JoinExpr)
