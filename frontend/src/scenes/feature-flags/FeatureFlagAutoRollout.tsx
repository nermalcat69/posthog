import { LemonButton, LemonDivider, LemonInput, LemonSelect, LemonTag } from '@posthog/lemon-ui'
import { Row } from 'antd'
import { useActions, useValues } from 'kea'
import { Group } from 'kea-forms'
import { IconDelete } from 'lib/components/icons'
import { Spinner } from 'lib/components/Spinner/Spinner'
import { TaxonomicFilterGroupType } from 'lib/components/TaxonomicFilter/types'
import { Field } from 'lib/forms/Field'
import { humanFriendlyNumber } from 'lib/utils'
import { ActionFilter } from 'scenes/insights/filters/ActionFilter/ActionFilter'
import { RolloutConditionType } from '~/types'
import { featureFlagLogic } from './featureFlagLogic'

export function FeatureFlagAutoRollback(): JSX.Element {
    const { featureFlag, sentryErrorCount } = useValues(featureFlagLogic)
    const { addRollbackCondition, removeRollbackCondition } = useActions(featureFlagLogic)

    return (
        <div>
            <div className="mb-2">
                <b>Auto rollback</b>
                <LemonTag type="warning" className="uppercase ml-2">
                    Beta
                </LemonTag>
                <div className="mt-2">
                    Specify the conditions in which this feature flag will trigger a warning or automatically roll back.
                </div>
            </div>

            {featureFlag.rollback_conditions.map((_, index) => (
                <>
                    {index > 0 && <div className="condition-set-separator">OR</div>}
                    <div className="mb-4 border rounded p-4">
                        <Group name={['rollback_conditions', index]}>
                            <Row align="middle" justify="space-between">
                                <Row>
                                    <div className="mt-3 mr-3">
                                        <b>Rollback Condition Type</b>
                                    </div>
                                    <Field name="threshold_type">
                                        {({ value, onChange }) => (
                                            <LemonSelect
                                                value={value}
                                                onChange={onChange}
                                                options={[
                                                    { value: RolloutConditionType.Sentry, label: 'Error Based' },
                                                    { value: RolloutConditionType.Insight, label: 'Metric Based' },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                </Row>
                                <LemonButton
                                    icon={<IconDelete />}
                                    status="muted"
                                    noPadding
                                    onClick={() => {
                                        removeRollbackCondition(index)
                                    }}
                                />
                            </Row>
                            <LemonDivider className="my-3" />
                            {featureFlag.rollback_conditions[index].threshold_type == 'insight' ? (
                                <div className="flex gap-2 items-center mt-4">
                                    When
                                    <Field name="threshold_metric">
                                        {({ value, onChange }) => (
                                            <ActionFilter
                                                filters={value}
                                                setFilters={(payload) => {
                                                    onChange({
                                                        ...payload,
                                                    })
                                                }}
                                                typeKey={'feature-flag-rollback-trends-' + index}
                                                buttonCopy={'Add graph series'}
                                                showSeriesIndicator={false}
                                                showNestedArrow
                                                hideRename={true}
                                                entitiesLimit={1}
                                                propertiesTaxonomicGroupTypes={[
                                                    TaxonomicFilterGroupType.EventProperties,
                                                    TaxonomicFilterGroupType.PersonProperties,
                                                    TaxonomicFilterGroupType.EventFeatureFlags,
                                                    TaxonomicFilterGroupType.Cohorts,
                                                    TaxonomicFilterGroupType.Elements,
                                                ]}
                                            />
                                        )}
                                    </Field>
                                    is
                                    <Field name="operator">
                                        {({ value, onChange }) => (
                                            <LemonSelect
                                                value={value}
                                                onChange={onChange}
                                                options={[
                                                    { label: 'greater than', value: 'gt' },
                                                    { label: 'less than', value: 'lt' },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                    <Field name="threshold">
                                        <LemonInput min={0} type="number" />
                                    </Field>
                                </div>
                            ) : (
                                <div>
                                    <Row align="middle">
                                        {sentryErrorCount ? (
                                            <span>
                                                <b>{humanFriendlyNumber(sentryErrorCount as number)} </b> sentry errors
                                                in the past 24 hours.{' '}
                                            </span>
                                        ) : (
                                            <Spinner />
                                        )}
                                        <span>&nbsp;Trigger when there is a</span>
                                        <Field name="threshold" className="ml-3 mr-3">
                                            {({ value, onChange }) => (
                                                <LemonInput
                                                    value={value}
                                                    suffix={<>%</>}
                                                    type="number"
                                                    min={0}
                                                    onChange={onChange}
                                                />
                                            )}
                                        </Field>
                                        <Field name="operator" className="mr-3">
                                            {({ value, onChange }) => (
                                                <LemonSelect
                                                    options={[
                                                        { label: 'increase', value: 'gt' },
                                                        { label: 'decrease', value: 'lt' },
                                                    ]}
                                                    value={value}
                                                    onChange={onChange}
                                                />
                                            )}
                                        </Field>
                                        <span>
                                            to{' '}
                                            {sentryErrorCount ? (
                                                <b>
                                                    {humanFriendlyNumber(
                                                        Math.round(
                                                            (sentryErrorCount as number) *
                                                                (1 +
                                                                    (featureFlag.rollback_conditions[index].threshold ||
                                                                        0) /
                                                                        100)
                                                        )
                                                    )}
                                                </b>
                                            ) : (
                                                <Spinner />
                                            )}{' '}
                                            errors.
                                        </span>
                                        <div />
                                    </Row>
                                </div>
                            )}
                        </Group>
                    </div>
                </>
            ))}
            <LemonButton
                type="secondary"
                onClick={() => {
                    addRollbackCondition()
                }}
            >
                Add condition
            </LemonButton>
        </div>
    )
}
