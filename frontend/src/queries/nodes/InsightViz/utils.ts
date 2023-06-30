import { ActionsNode, BreakdownFilter, EventsNode, InsightQueryNode, TrendsQuery } from '~/queries/schema'
import { ActionType, ChartDisplayType, InsightModel, IntervalType } from '~/types'
import { queryNodeToFilter, seriesToActionsAndEvents } from '../InsightQuery/utils/queryNodeToFilter'
import { getEventNamesForAction } from 'lib/utils'
import {
    isInsightQueryWithBreakdown,
    isInsightQueryWithSeries,
    isStickinessQuery,
    isTrendsQuery,
} from '~/queries/utils'
import { compareFilters } from 'scenes/insights/utils/compareFilters'

export const getAllEventNames = (query: InsightQueryNode, allActions: ActionType[]): string[] => {
    const { actions, events } = seriesToActionsAndEvents((query as TrendsQuery).series || [])

    // If there's a "All events" entity, don't filter by event names.
    if (events.find((e) => e.id === null)) {
        return []
    }

    const allEvents = [
        ...events.map((e) => String(e.id)),
        ...actions.flatMap((action) => getEventNamesForAction(action.id as string | number, allActions)),
    ]

    // remove duplicates and empty events
    return Array.from(new Set(allEvents.filter((a): a is string => !!a)))
}

export const getDisplay = (query: InsightQueryNode): ChartDisplayType | undefined => {
    if (isStickinessQuery(query)) {
        return query.stickinessFilter?.display
    } else if (isTrendsQuery(query)) {
        return query.trendsFilter?.display
    } else {
        return undefined
    }
}

export const getCompare = (query: InsightQueryNode): boolean | undefined => {
    if (isStickinessQuery(query)) {
        return query.stickinessFilter?.compare
    } else if (isTrendsQuery(query)) {
        return query.trendsFilter?.compare
    } else {
        return undefined
    }
}

export const getFormula = (query: InsightQueryNode): string | undefined => {
    if (isTrendsQuery(query)) {
        return query.trendsFilter?.formula
    } else {
        return undefined
    }
}

export const getSeries = (query: InsightQueryNode): (EventsNode | ActionsNode)[] | undefined => {
    if (isInsightQueryWithSeries(query)) {
        return query.series
    } else {
        return undefined
    }
}

export const getInterval = (query: InsightQueryNode): IntervalType | undefined => {
    if (isInsightQueryWithSeries(query)) {
        return query.interval
    } else {
        return undefined
    }
}

export const getBreakdown = (query: InsightQueryNode): BreakdownFilter | undefined => {
    if (isInsightQueryWithBreakdown(query)) {
        return query.breakdown
    } else {
        return undefined
    }
}

export const getCachedResults = (
    cachedInsight: Partial<InsightModel> | undefined | null,
    query: InsightQueryNode
): Partial<InsightModel> | undefined => {
    if (
        !cachedInsight ||
        cachedInsight.result === null ||
        cachedInsight.result === undefined ||
        cachedInsight.filters === undefined
    ) {
        return undefined
    }

    // only set the cached result when the filters match the currently set ones
    const cachedFilters = cachedInsight.filters
    const currentFilters = queryNodeToFilter(query)

    if (!compareFilters(cachedFilters, currentFilters)) {
        return undefined
    }

    return cachedInsight
}
