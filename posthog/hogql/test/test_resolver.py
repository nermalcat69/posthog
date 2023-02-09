from posthog.hogql import ast
from posthog.hogql.parser import parse_select
from posthog.hogql.resolver import resolve_symbols
from posthog.test.base import BaseTest


class TestResolver(BaseTest):
    def test_resolve_events_table(self):
        expr = parse_select("SELECT event, events.timestamp FROM events WHERE events.event = 'test'")
        resolve_symbols(expr)

        events_table_symbol = ast.TableSymbol(name="events", table_name="events")
        event_field_symbol = ast.FieldSymbol(name="event", table=events_table_symbol)
        timestamp_field_symbol = ast.FieldSymbol(name="timestamp", table=events_table_symbol)
        select_query_symbol = ast.SelectQuerySymbol(
            name="",
            symbols={},
            tables={"events": events_table_symbol},
        )

        self.assertEqual(
            expr,
            ast.SelectQuery(
                select=[
                    ast.Field(chain=["event"], symbol=event_field_symbol),
                    ast.Field(chain=["events", "timestamp"], symbol=timestamp_field_symbol),
                ],
                select_from=ast.JoinExpr(
                    table=ast.Field(chain=["events"], symbol=events_table_symbol),
                    alias="events",
                ),
                where=ast.CompareOperation(
                    left=ast.Field(chain=["events", "event"], symbol=event_field_symbol),
                    op=ast.CompareOperationType.Eq,
                    right=ast.Constant(value="test"),
                ),
                symbol=select_query_symbol,
            ),
        )

    def test_resolve_events_table_alias(self):
        expr = parse_select("SELECT event, e.timestamp FROM events e WHERE e.event = 'test'")
        resolve_symbols(expr)

        events_table_symbol = ast.TableSymbol(name="e", table_name="events")
        event_field_symbol = ast.FieldSymbol(name="event", table=events_table_symbol)
        timestamp_field_symbol = ast.FieldSymbol(name="timestamp", table=events_table_symbol)
        select_query_symbol = ast.SelectQuerySymbol(
            name="",
            symbols={},
            tables={"e": events_table_symbol},
        )

        self.assertEqual(
            expr,
            ast.SelectQuery(
                select=[
                    ast.Field(chain=["event"], symbol=event_field_symbol),
                    ast.Field(chain=["e", "timestamp"], symbol=timestamp_field_symbol),
                ],
                select_from=ast.JoinExpr(
                    table=ast.Field(chain=["events"], symbol=events_table_symbol),
                    alias="e",
                ),
                where=ast.CompareOperation(
                    left=ast.Field(chain=["e", "event"], symbol=event_field_symbol),
                    op=ast.CompareOperationType.Eq,
                    right=ast.Constant(value="test"),
                ),
                symbol=select_query_symbol,
            ),
        )

    def test_resolve_events_table_column_alias(self):
        expr = parse_select("SELECT event as ee, ee, ee as e, e.timestamp FROM events e WHERE e.event = 'test'")
        resolve_symbols(expr)

        events_table_symbol = ast.TableSymbol(name="e", table_name="events")
        event_field_symbol = ast.FieldSymbol(name="event", table=events_table_symbol)
        timestamp_field_symbol = ast.FieldSymbol(name="timestamp", table=events_table_symbol)
        select_query_symbol = ast.SelectQuerySymbol(
            name="",
            symbols={
                "ee": ast.AliasSymbol(name="ee", symbol=event_field_symbol),
                "e": ast.AliasSymbol(name="e", symbol=ast.AliasSymbol(name="ee", symbol=event_field_symbol)),
            },
            tables={"e": events_table_symbol},
        )

        expected_query = ast.SelectQuery(
            select=[
                ast.Alias(
                    alias="ee",
                    expr=ast.Field(chain=["event"], symbol=event_field_symbol),
                    symbol=ast.AliasSymbol(name="ee", symbol=event_field_symbol),
                ),
                ast.Field(chain=["ee"], symbol=ast.AliasSymbol(name="ee", symbol=event_field_symbol)),
                ast.Alias(
                    alias="e",
                    expr=ast.Field(chain=["ee"], symbol=ast.AliasSymbol(name="ee", symbol=event_field_symbol)),
                    symbol=ast.AliasSymbol(name="e", symbol=ast.AliasSymbol(name="ee", symbol=event_field_symbol)),
                ),
                ast.Field(chain=["e", "timestamp"], symbol=timestamp_field_symbol),
            ],
            select_from=ast.JoinExpr(
                table=ast.Field(chain=["events"], symbol=events_table_symbol),
                alias="e",
            ),
            where=ast.CompareOperation(
                left=ast.Field(chain=["e", "event"], symbol=event_field_symbol),
                op=ast.CompareOperationType.Eq,
                right=ast.Constant(value="test"),
            ),
            symbol=select_query_symbol,
        )
        # asserting individually to help debug if something is off
        self.assertEqual(expr.select, expected_query.select)
        self.assertEqual(expr.select_from, expected_query.select_from)
        self.assertEqual(expr.where, expected_query.where)
        self.assertEqual(expr.symbol, expected_query.symbol)
        self.assertEqual(expr, expected_query)

    def test_resolve_events_table_column_alias_inside_subquery(self):
        expr = parse_select("SELECT b FROM (select event as b, timestamp as c from events) e WHERE e.b = 'test'")
        resolve_symbols(expr)
        events_table_symbol = ast.TableSymbol(name="events", table_name="events")
        event_field_symbol = ast.FieldSymbol(name="event", table=events_table_symbol)
        timestamp_field_symbol = ast.FieldSymbol(name="timestamp", table=events_table_symbol)
        expected_query = ast.SelectQuery(
            select=[
                ast.Field(
                    chain=["b"],
                    symbol=ast.AliasSymbol(
                        name="b",
                        symbol=event_field_symbol,
                    ),
                ),
            ],
            select_from=ast.JoinExpr(
                table=ast.SelectQuery(
                    select=[
                        ast.Alias(
                            alias="b",
                            expr=ast.Field(chain=["event"], symbol=event_field_symbol),
                            symbol=ast.AliasSymbol(
                                name="b",
                                symbol=event_field_symbol,
                            ),
                        ),
                        ast.Alias(
                            alias="c",
                            expr=ast.Field(chain=["timestamp"], symbol=timestamp_field_symbol),
                            symbol=ast.AliasSymbol(
                                name="c",
                                symbol=timestamp_field_symbol,
                            ),
                        ),
                    ],
                    select_from=ast.JoinExpr(
                        table=ast.Field(chain=["events"], symbol=events_table_symbol),
                        alias="events",
                    ),
                    symbol=ast.SelectQuerySymbol(
                        name="e",
                        symbols={
                            "b": ast.AliasSymbol(
                                name="b",
                                symbol=event_field_symbol,
                            ),
                            "c": ast.AliasSymbol(
                                name="c",
                                symbol=timestamp_field_symbol,
                            ),
                        },
                        tables={
                            "events": events_table_symbol,
                        },
                    ),
                ),
                alias="e",
            ),
            where=ast.CompareOperation(
                left=ast.Field(
                    chain=["e", "b"],
                    symbol=ast.AliasSymbol(
                        name="b",
                        symbol=event_field_symbol,
                    ),
                ),
                op=ast.CompareOperationType.Eq,
                right=ast.Constant(value="test"),
            ),
            symbol=ast.SelectQuerySymbol(
                name="",
                symbols={},
                tables={
                    "e": ast.SelectQuerySymbol(
                        name="e",
                        symbols={
                            "b": ast.AliasSymbol(
                                name="b",
                                symbol=event_field_symbol,
                            ),
                            "c": ast.AliasSymbol(
                                name="c",
                                symbol=timestamp_field_symbol,
                            ),
                        },
                        tables={
                            "events": events_table_symbol,
                        },
                    )
                },
            ),
        )
        # asserting individually to help debug if something is off
        self.assertEqual(expr.select, expected_query.select)
        self.assertEqual(expr.select_from, expected_query.select_from)
        self.assertEqual(expr.where, expected_query.where)
        self.assertEqual(expr.symbol, expected_query.symbol)
        self.assertEqual(expr, expected_query)


# "with 2 as a select 1 as a" -> "Different expressions with the same alias a:"
# "with 2 as b, 3 as c select (select 1 as b) as a, b, c" -> "Different expressions with the same alias b:"


# "select a, b, e.c from (select 1 as a, 2 as b, 3 as c) as e" -> 1, 2, 3
