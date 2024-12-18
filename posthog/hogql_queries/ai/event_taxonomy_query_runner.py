from typing import cast

from posthog.hogql import ast
from posthog.hogql.parser import parse_expr, parse_select
from posthog.hogql.printer import to_printed_hogql
from posthog.hogql.query import execute_hogql_query
from posthog.hogql_queries.ai.utils import TaxonomyCacheMixin
from posthog.hogql_queries.query_runner import QueryRunner
from posthog.schema import (
    CachedEventTaxonomyQueryResponse,
    EventTaxonomyItem,
    EventTaxonomyQuery,
    EventTaxonomyQueryResponse,
)


class EventTaxonomyQueryRunner(TaxonomyCacheMixin, QueryRunner):
    query: EventTaxonomyQuery
    response: EventTaxonomyQueryResponse
    cached_response: CachedEventTaxonomyQueryResponse

    def calculate(self):
        query = self.to_query()
        hogql = to_printed_hogql(query, self.team)

        response = execute_hogql_query(
            query_type="EventTaxonomyQuery",
            query=query,
            team=self.team,
            timings=self.timings,
            modifiers=self.modifiers,
            limit_context=self.limit_context,
        )

        results: list[EventTaxonomyItem] = []
        for prop, sample_values, sample_count in response.results:
            results.append(
                EventTaxonomyItem(
                    property=prop,
                    sample_values=sample_values,
                    sample_count=sample_count,
                )
            )

        return EventTaxonomyQueryResponse(
            results=results,
            timings=response.timings,
            hogql=hogql,
            modifiers=self.modifiers,
        )

    def to_query(self) -> ast.SelectQuery | ast.SelectSetQuery:
        if not self.query.properties:
            return parse_select(
                """
                SELECT
                    key,
                    -- Pick five latest distinct sample values.
                    arraySlice(arrayDistinct(groupArray(value)), 1, 5) AS values,
                    count(distinct value) AS total_count
                FROM {from_query}
                ARRAY JOIN kv.1 AS key, kv.2 AS value
                WHERE {filter}
                GROUP BY key
                ORDER BY total_count DESC
                LIMIT 500
            """,
                placeholders={"from_query": self._get_subquery(), "filter": self._get_omit_filter()},
            )

        return parse_select(
            """
                SELECT
                    key,
                    arraySlice(arrayDistinct(groupArray(value)), 1, 5) AS values,
                    count(DISTINCT value) AS total_count
                FROM {from_query}
                GROUP BY key
                LIMIT 500
            """,
            placeholders={
                "from_query": self._get_subquery(),
            },
        )

    def _get_omit_filter(self):
        """
        Ignore properties that are not useful for AI.
        """
        omit_list = [
            # events
            r"\$set",
            r"\$time",
            r"\$set_once",
            r"\$sent_at",
            # privacy-related
            r"\$ip",
            # flatten-properties-plugin
            "__",
            # other metadata
            "phjs",
            "survey_dismissed",
            "survey_responded",
            "partial_filter_chosen",
            "changed_action",
            "window-id",
            "changed_event",
            "partial_filter",
        ]
        regex_conditions = "|".join(omit_list)

        return ast.Not(
            expr=ast.Call(
                name="match",
                args=[
                    ast.Field(chain=["key"]),
                    ast.Constant(value=f"({regex_conditions})"),
                ],
            )
        )

    def _get_subquery_filter(self) -> ast.Expr:
        date_filter = parse_expr("timestamp >= now() - INTERVAL 30 DAY")
        filter_expr: list[ast.Expr] = [
            date_filter,
            ast.CompareOperation(
                left=ast.Field(chain=["event"]),
                right=ast.Constant(value=self.query.event),
                op=ast.CompareOperationOp.Eq,
            ),
        ]

        if self.query.properties:
            filter_expr.append(
                ast.Or(
                    exprs=[
                        ast.CompareOperation(
                            left=ast.Field(chain=["properties", prop]),
                            op=ast.CompareOperationOp.NotEq,
                            right=ast.Constant(value=""),
                        )
                        for prop in self.query.properties
                    ]
                )
            )

        return ast.And(exprs=filter_expr)

    def _get_subquery(self) -> ast.SelectQuery:
        if self.query.properties:
            query = parse_select(
                """
                    SELECT
                        key,
                        value,
                        count() as count
                    FROM (
                        SELECT
                            {props} as kv
                        FROM
                            events
                        WHERE {filter}
                    )
                    ARRAY JOIN kv.1 AS key, kv.2 AS value
                    WHERE value != ''
                    GROUP BY key, value
                    ORDER BY count DESC
                """,
                placeholders={
                    "props": ast.Array(
                        exprs=[
                            ast.Tuple(
                                exprs=[
                                    ast.Constant(value=prop),
                                    ast.Call(
                                        name="JSONExtractString",
                                        args=[ast.Field(chain=["properties"]), ast.Constant(value=prop)],
                                    ),
                                ]
                            )
                            for prop in self.query.properties
                        ]
                    ),
                    "filter": self._get_subquery_filter(),
                },
            )
        else:
            query = parse_select(
                """
                SELECT
                    JSONExtractKeysAndValues(properties, 'String') as kv
                FROM
                    events
                WHERE {filter}
                ORDER BY timestamp desc
                LIMIT 100
            """,
                placeholders={"filter": self._get_subquery_filter()},
            )

        return cast(ast.SelectQuery, query)
