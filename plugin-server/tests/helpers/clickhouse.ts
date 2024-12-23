import ClickHouse from '@posthog/clickhouse'
import { performance } from 'perf_hooks'

import { defaultConfig } from '../../src/config/config'
import { PluginsServerConfig } from '../../src/types'
import { status } from '../../src/utils/status'
import { delay } from '../../src/utils/utils'

export async function resetTestDatabaseClickhouse(extraServerConfig?: Partial<PluginsServerConfig>): Promise<void> {
    const config = { ...defaultConfig, ...extraServerConfig }
    const clickhouse = new ClickHouse({
        host: config.CLICKHOUSE_HOST,
        port: 8123,
        dataObjects: true,
        queryOptions: {
            database: config.CLICKHOUSE_DATABASE,
            output_format_json_quote_64bit_integers: false,
        },
    })
    await Promise.all([
        clickhouse.querying('TRUNCATE sharded_events'),
        clickhouse.querying('TRUNCATE person'),
        clickhouse.querying('TRUNCATE person_distinct_id'),
        clickhouse.querying('TRUNCATE person_distinct_id2'),
        clickhouse.querying('TRUNCATE person_static_cohort'),
        clickhouse.querying('TRUNCATE sharded_session_recording_events'),
        clickhouse.querying('TRUNCATE plugin_log_entries'),
        clickhouse.querying('TRUNCATE events_dead_letter_queue'),
        clickhouse.querying('TRUNCATE groups'),
        clickhouse.querying('TRUNCATE sharded_ingestion_warnings'),
        clickhouse.querying('TRUNCATE sharded_app_metrics'),
    ])
}

export async function delayUntilEventIngested<T extends any[] | number>(
    fetchData: () => T | Promise<T>,
    options: {
        minLength?: number
        delayMs?: number
        maxDelayMs?: number
    } = {}
): Promise<T> {
    const { minLength = 1, delayMs = 100, maxDelayMs = 30000 } = options
    const timer = performance.now()
    let data: T
    let dataLength = 0

    while (performance.now() - timer < maxDelayMs) {
        data = await fetchData()
        dataLength = typeof data === 'number' ? data : data.length
        status.debug(
            `Waiting. ${Math.round((performance.now() - timer) / 100) / 10}s since the start. ${dataLength} event${
                dataLength !== 1 ? 's' : ''
            }.`
        )
        if (dataLength >= minLength) {
            return data
        }
        await delay(delayMs)
    }
    throw Error(`Failed to get data in time, got ${JSON.stringify(data)}`)
}
