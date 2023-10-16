import { useValues, useActions } from 'kea'

import { insightLogic } from 'scenes/insights/insightLogic'
import { insightVizLogic } from '../insightVizLogic'

import { LemonCheckbox } from '@posthog/lemon-ui'

export function ShowLegendFilter(): JSX.Element | null {
    const { insightProps } = useValues(insightLogic)
    const { showLegend } = useValues(insightVizLogic(insightProps))
    const { updateInsightFilter } = useActions(insightVizLogic(insightProps))

    const toggleShowLegend = (): void => {
        updateInsightFilter({ show_legend: !showLegend })
    }

    return (
        <LemonCheckbox
            className="p-1 px-2"
            onChange={toggleShowLegend}
            checked={!!showLegend}
            label={<span className="font-normal">{showLegend ? 'Hide' : 'Show'} legend</span>}
            size="small"
        />
    )
}
