from posthog.hogql import ast
from posthog.hogql.database.models import (
    Table,
    IntegerDatabaseField,
    StringDatabaseField,
    DateTimeDatabaseField,
    LazyTable,
    FieldOrTable,
    LazyTableToAdd,
    FloatDatabaseField,
)
from posthog.hogql.parser import parse_expr

QUERY_LOG_FIELDS: dict[str, FieldOrTable] = {
    "query_start_time": DateTimeDatabaseField(name="query_start_time"),
    "query": StringDatabaseField(name="query"),
    "log_comment": StringDatabaseField(name="log_comment"),
    "user_id": IntegerDatabaseField(name="user_id"),
    "team_id": IntegerDatabaseField(name="team_id"),
    "query_duration_ms": FloatDatabaseField(name="query_duration_ms"),
    "exception": StringDatabaseField(name="exception"),
    "event_time": DateTimeDatabaseField(name="event_time_microseconds"),
    "cache_key": StringDatabaseField(name="cache_key"),
    "type": StringDatabaseField(name="type"),
    "query_type": StringDatabaseField(name="query_type"),
}

STRING_FIELDS = {"cache_key", "query_type"}
INT_FIELDS = {"team_id", "user_id"}


class QueryLogTable(LazyTable):
    fields: dict[str, FieldOrTable] = QUERY_LOG_FIELDS

    def to_printed_clickhouse(self, context):
        return "lazy_query_log"

    def to_printed_hogql(self):
        return "lazy_query_log"

    def lazy_select(self, table_to_add: LazyTableToAdd, context, node):
        requested_fields = table_to_add.fields_accessed

        table_name = "raw_query_log"

        def get_alias(name, chain):
            if name in STRING_FIELDS:
                return ast.Alias(alias=name, expr=parse_expr(f"JSONExtractString(log_comment, '{name}')"))
            if name in INT_FIELDS:
                return ast.Alias(alias=name, expr=parse_expr(f"JSONExtractInt(log_comment, '{name}')"))
            return ast.Alias(alias=name, expr=ast.Field(chain=[table_name, *chain]))

        fields: list[ast.Expr] = [get_alias(name, chain) for name, chain in requested_fields.items()]

        return ast.SelectQuery(
            select=fields,
            # distinct=True,
            select_from=ast.JoinExpr(table=ast.Field(chain=[table_name])),
            # where=(
            #     ast.CompareOperation(
            #         op=ast.CompareOperationOp.In,
            #         left=ast.Tuple(exprs=[ast.Field(chain=[table_name, "team_id"])]),
            #         right=ast.Constant(value=""),
            #     )
            # ),
        )


class RawQueryLogTable(Table):
    fields: dict[str, FieldOrTable] = QUERY_LOG_FIELDS

    def to_printed_clickhouse(self, context):
        return "system.query_log"

    def to_printed_hogql(self):
        return "system.query_log"
