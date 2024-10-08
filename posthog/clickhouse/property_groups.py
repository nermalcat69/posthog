import dataclasses
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass

from posthog import settings


@dataclass
class PropertyGroupDefinition:
    key_filter_expression: str
    key_filter_function: Callable[[str], bool]
    codec: str = "ZSTD(1)"
    is_materialized: bool = True

    def contains(self, property_key: str) -> bool:
        return self.key_filter_function(property_key)


TableName = str
ColumnName = str
PropertyGroupName = str


@dataclass
class IndexDefinition:
    name: str
    expression: str
    type: str

    def __str__(self) -> str:
        return f"{self.name} {self.expression} TYPE {self.type}"


@dataclass
class Mutation:
    table: TableName
    command: str

    def __str__(self) -> str:
        return f"ALTER TABLE {self.table} {self.command}"


class PropertyGroupManager:
    def __init__(
        self,
        cluster: str,
        groups: Mapping[TableName, Mapping[ColumnName, Mapping[PropertyGroupName, PropertyGroupDefinition]]],
    ) -> None:
        self.__cluster = cluster
        self.__groups = groups

    def __get_map_column_name(self, column: ColumnName, group_name: PropertyGroupName) -> str:
        return f"{column}_group_{group_name}"

    def get_property_group_columns(self, table: TableName, column: ColumnName, property_key: str) -> Iterable[str]:
        if (table_groups := self.__groups.get(table)) and (column_groups := table_groups.get(column)):
            for group_name, group_definition in column_groups.items():
                if group_definition.contains(property_key):
                    yield self.__get_map_column_name(column, group_name)

    def __get_column_definition(self, table: TableName, column: ColumnName, group_name: PropertyGroupName) -> str:
        group_definition = self.__groups[table][column][group_name]
        map_column_name = self.__get_map_column_name(column, group_name)
        column_definition = f"{map_column_name} Map(String, String)"
        if not group_definition.is_materialized:
            return column_definition
        else:
            return f"""\
                {column_definition}
                MATERIALIZED mapSort(
                    mapFilter((key, _) -> {group_definition.key_filter_expression},
                    CAST(JSONExtractKeysAndValues({column}, 'String'), 'Map(String, String)'))
                )
                CODEC({group_definition.codec})
            """

    def __get_index_definitions(
        self, table: TableName, column: ColumnName, group_name: PropertyGroupName
    ) -> Iterable[IndexDefinition]:
        group_definition = self.__groups[table][column][group_name]
        if not group_definition.is_materialized:
            return

        map_column_name = self.__get_map_column_name(column, group_name)
        yield IndexDefinition(f"{map_column_name}_keys_bf", f"mapKeys({map_column_name})", "bloom_filter")
        yield IndexDefinition(f"{map_column_name}_values_bf", f"mapValues({map_column_name})", "bloom_filter")

    def get_create_table_pieces(self, table: TableName) -> Iterable[str]:
        for column, groups in self.__groups[table].items():
            for group_name in groups:
                yield self.__get_column_definition(table, column, group_name)
                for index_definition in self.__get_index_definitions(table, column, group_name):
                    yield f"INDEX {index_definition}"

    def get_alter_create_statements(
        self, table: TableName, column: ColumnName, group_name: PropertyGroupName
    ) -> Iterable[str]:
        yield f"ALTER TABLE {table} ON CLUSTER {self.__cluster} ADD COLUMN IF NOT EXISTS {self.__get_column_definition(table, column, group_name)}"
        for index_definition in self.__get_index_definitions(table, column, group_name):
            yield f"ALTER TABLE {table} ON CLUSTER {self.__cluster} ADD INDEX IF NOT EXISTS {index_definition}"

    def get_materialization_mutations(
        self, table: TableName, partitions: Iterable[str] | None = None
    ) -> Iterable[Mutation]:
        mutations: list[Mutation] = []
        for column, property_groups in self.__groups[table].items():
            for group_name in property_groups.keys():
                column_name = self.__get_map_column_name(column, group_name)
                mutations.append(Mutation(table, f"MATERIALIZE COLUMN {column_name}"))
                for index in self.__get_index_definitions(table, column, group_name):
                    mutations.append(Mutation(table, f"MATERIALIZE INDEX {index.name}"))

        if partitions is None:
            yield from mutations
        else:
            for partition in partitions:
                yield from (
                    dataclasses.replace(mutation, command=f"{mutation.command} IN PARTITION '{partition}'")
                    for mutation in mutations
                )


ignore_custom_properties = [
    # `token` & `distinct_id` properties are sent with ~50% of events and by
    # many teams, and should not be treated as custom properties and their use
    # should be optimized separately
    "token",
    "distinct_id",
    # campaign properties are defined by external entities and are commonly used
    # across a large number of teams, and should also be optimized separately
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",  # google ads
    "gad_source",  # google ads
    "gclsrc",  # google ads 360
    "dclid",  # google display ads
    "gbraid",  # google ads, web to app
    "wbraid",  # google ads, app to web
    "fbclid",  # facebook
    "msclkid",  # microsoft
    "twclid",  # twitter
    "li_fat_id",  # linkedin
    "mc_cid",  # mailchimp campaign id
    "igshid",  # instagram
    "ttclid",  # tiktok
    "rdt_cid",  # reddit
]

event_property_group_definitions = {
    "properties": {
        "custom": PropertyGroupDefinition(
            f"key NOT LIKE '$%' AND key NOT IN (" + f", ".join(f"'{name}'" for name in ignore_custom_properties) + f")",
            lambda key: not key.startswith("$") and key not in ignore_custom_properties,
        ),
        "feature_flags": PropertyGroupDefinition(
            "key like '$feature/%'",
            lambda key: key.startswith("$feature/"),
        ),
    }
}

property_groups = PropertyGroupManager(
    settings.CLICKHOUSE_CLUSTER,
    {
        "sharded_events": event_property_group_definitions,
        "events": {
            column_name: {
                group_name: dataclasses.replace(group_definition, is_materialized=False)
                for group_name, group_definition in column_group_definitions.items()
            }
            for column_name, column_group_definitions in event_property_group_definitions.items()
        },
    },
)
