import { IconCrown } from '@posthog/icons'
import {
    LemonButton,
    LemonSelect,
    LemonSelectMultiple,
    LemonSelectOption,
    LemonSnack,
    LemonTable,
} from '@posthog/lemon-ui'
import { BindLogic, useActions, useAsyncActions, useValues } from 'kea'
import { OrganizationMembershipLevel, TeamMembershipLevel } from 'lib/constants'
import { LemonTableColumns } from 'lib/lemon-ui/LemonTable'
import { ProfilePicture } from 'lib/lemon-ui/ProfilePicture'
import { Tooltip } from 'lib/lemon-ui/Tooltip'
import { capitalizeFirstLetter } from 'lib/utils'
import {
    getReasonForAccessLevelChangeProhibition,
    membershipLevelToName,
    teamMembershipLevelIntegers,
} from 'lib/utils/permissioning'
import { useState } from 'react'
import { teamMembersLogic } from 'scenes/settings/project/teamMembersLogic'
import { isAuthenticatedTeam, teamLogic } from 'scenes/teamLogic'
import { userLogic } from 'scenes/userLogic'

import {
    AccessControlType,
    AccessControlTypeMember,
    AccessControlTypeRole,
    FusedTeamMemberType,
    OrganizationMemberType,
} from '~/types'

import { accessControlLogic, AccessControlLogicProps } from './accessControlLogic'

export function AccessControlObject(props: AccessControlLogicProps): JSX.Element | null {
    const { resource } = props

    const suffix = props.resource_id ? `this ${resource}` : `all ${resource}s`

    return (
        <BindLogic logic={accessControlLogic} props={props}>
            <div className="space-y-4">
                <h3>Default access to {suffix}</h3>
                <AccessControlObjectDefaults />

                <h3>Members with explicit access to {suffix}</h3>
                <AccessControlObjectUsers />

                <h3>Roles with explicit access to {suffix}</h3>
                <AccessControlObjectRoles />
            </div>
        </BindLogic>
    )
}

function AccessControlObjectDefaults(): JSX.Element | null {
    const { accessControlProject, accessControlsLoading } = useValues(accessControlLogic)
    const { updateaccessControlProject } = useActions(accessControlLogic)

    return (
        <LemonSelect
            value={accessControlProject?.access_level ?? null}
            onChange={(newValue) => {
                updateaccessControlProject(newValue)
            }}
            disabledReason={accessControlsLoading ? 'Loading…' : undefined}
            options={[
                {
                    value: null,
                    label: 'No access by default',
                },
                {
                    value: 'member',
                    label: 'Everyone is a member by default',
                },
                {
                    value: 'admin',
                    label: 'Everyone is an admin by default',
                },
            ]}
            fullWidth
        />
    )
}

function AccessControlObjectUsers(): JSX.Element | null {
    const { user } = useValues(userLogic)
    const { membersById, addableMembers, accessControlMembers, accessControlsLoading, availableLevels } =
        useValues(accessControlLogic)
    const { updateAccessControlMembers } = useAsyncActions(accessControlLogic)

    if (!user) {
        return null
    }

    const member = (ac: AccessControlTypeMember): OrganizationMemberType => {
        return membersById[ac.organization_membership]
    }

    // TODO: WHAT A MESS - Fix this to do the index mapping beforehand...
    const columns: LemonTableColumns<AccessControlTypeMember> = [
        {
            key: 'user_profile_picture',
            render: function ProfilePictureRender(_, ac) {
                return <ProfilePicture user={member(ac)?.user} />
            },
            width: 32,
        },
        {
            title: 'Name',
            key: 'user_first_name',
            render: (_, ac) => (
                <b>
                    {member(ac)?.user.uuid == user.uuid
                        ? `${member(ac)?.user.first_name} (you)`
                        : member(ac)?.user.first_name}
                </b>
            ),
            sorter: (a, b) => member(a)?.user.first_name.localeCompare(member(b)?.user.first_name),
        },
        {
            title: 'Email',
            key: 'user_email',
            render: (_, ac) => member(ac)?.user.email,
            sorter: (a, b) => member(a)?.user.email.localeCompare(member(b)?.user.email),
        },
        {
            title: 'Level',
            key: 'level',
            width: 0,
            render: function LevelRender(_, { access_level, organization_membership }) {
                return (
                    <SimplLevelComponent
                        level={access_level}
                        onChange={(level) => updateAccessControlMembers([{ member: organization_membership, level }])}
                    />
                )
            },
        },
    ]

    return (
        <div className="space-y-2">
            <AddItemsControls
                placeholder="Search for team members to add…"
                onAdd={(newValues, level) => updateAccessControlMembers(newValues.map((member) => ({ member, level })))}
                options={addableMembers.map((member) => ({
                    key: member.id,
                    label: member.user.first_name,
                }))}
                levels={availableLevels}
            />

            <LemonTable columns={columns} dataSource={accessControlMembers} loading={accessControlsLoading} />
        </div>
    )
}

function AccessControlObjectRoles(): JSX.Element | null {
    const { accessControlRoles, accessControlsLoading, addableRoles, rolesById } = useValues(accessControlLogic)
    const { updateAccessControlRoles } = useAsyncActions(accessControlLogic)

    const columns: LemonTableColumns<AccessControlTypeRole> = [
        {
            title: 'Role',
            key: 'role',
            render: (_, { role }) => <b>{rolesById[role]?.name}</b>,
        },
        {
            title: 'Level',
            key: 'level',
            width: 0,
            render: (_, { access_level, role }) => {
                return (
                    <div className="my-2">
                        <SimplLevelComponent
                            level={access_level}
                            onChange={(level) => updateAccessControlRoles([{ role, level }])}
                        />
                    </div>
                )
            },
        },
    ]

    return (
        <div className="space-y-2">
            <AddItemsControls
                placeholder="Search for roles to add…"
                onAdd={(newValues, level) => updateAccessControlRoles(newValues.map((role) => ({ role, level })))}
                options={addableRoles.map((role) => ({
                    key: role.id,
                    label: role.name,
                }))}
                levels={['member', 'admin']}
            />

            <LemonTable columns={columns} dataSource={accessControlRoles} loading={accessControlsLoading} />
        </div>
    )
}

function LevelComponent(member: FusedTeamMemberType): JSX.Element | null {
    const { user } = useValues(userLogic)
    const { currentTeam } = useValues(teamLogic)
    const { changeUserAccessLevel } = useActions(teamMembersLogic)

    const myMembershipLevel = isAuthenticatedTeam(currentTeam) ? currentTeam.effective_membership_level : null

    if (!user) {
        return null
    }

    const isImplicit = member.organization_level >= OrganizationMembershipLevel.Admin
    const levelName = membershipLevelToName.get(member.level) ?? `unknown (${member.level})`

    const allowedLevels = teamMembershipLevelIntegers.filter(
        (listLevel) => !getReasonForAccessLevelChangeProhibition(myMembershipLevel, user, member, listLevel)
    )

    const possibleOptions = member.explicit_team_level
        ? allowedLevels.concat([member.explicit_team_level])
        : allowedLevels

    const disallowedReason = isImplicit
        ? `This user is a member of the project implicitly due to being an organization ${levelName}.`
        : getReasonForAccessLevelChangeProhibition(myMembershipLevel, user, member, allowedLevels)

    return disallowedReason ? (
        <Tooltip title={disallowedReason}>
            <LemonSnack className="capitalize">
                {member.level === OrganizationMembershipLevel.Owner && <IconCrown className="mr-2" />}
                {levelName}
            </LemonSnack>
        </Tooltip>
    ) : (
        <LemonSelect
            dropdownMatchSelectWidth={false}
            onChange={(listLevel) => {
                if (listLevel !== null) {
                    changeUserAccessLevel(member.user, listLevel)
                }
            }}
            options={possibleOptions.map(
                (listLevel) =>
                    ({
                        value: listLevel,
                        disabled: listLevel === member.explicit_team_level,
                        label:
                            listLevel > member.level
                                ? membershipLevelToName.get(listLevel)
                                : membershipLevelToName.get(listLevel),
                    } as LemonSelectOption<TeamMembershipLevel>)
            )}
            value={member.explicit_team_level}
        />
    )
}

function SimplLevelComponent(props: {
    level: AccessControlType['access_level']
    onChange: (newValue: AccessControlType['access_level']) => void
}): JSX.Element | null {
    const { availableLevels } = useValues(accessControlLogic)

    return (
        <LemonSelect
            value={props.level}
            onChange={(newValue) => props.onChange(newValue)}
            options={availableLevels.map((level) => ({
                value: level,
                label: capitalizeFirstLetter(level ?? ''),
            }))}
        />
    )
}

function AddItemsControls(props: {
    placeholder: string
    onAdd: (newValues: string[], level: AccessControlType['access_level']) => Promise<void>
    options: {
        key: string
        label: string
    }[]
    levels: AccessControlType['access_level'][]
}): JSX.Element | null {
    const [items, setItems] = useState<string[]>([])
    const [level, setLevel] = useState<AccessControlType['access_level']>()

    const onSubmit =
        items.length && level
            ? (): void =>
                  void props.onAdd(items, level).then(() => {
                      setItems([])
                      setLevel(undefined)
                  })
            : undefined

    return (
        <div className="flex gap-2">
            <div className="flex-1">
                <LemonSelectMultiple
                    placeholder={props.placeholder}
                    value={items}
                    onChange={(newValues: string[]) => setItems(newValues)}
                    filterOption={true}
                    mode="multiple"
                    options={props.options}
                />
            </div>
            <LemonSelect
                placeholder="Select level..."
                options={props.levels.map((level) => ({
                    value: level,
                    label: capitalizeFirstLetter(level ?? ''),
                }))}
                value={level}
                onChange={(newValue) => setLevel(newValue)}
            />
            <LemonButton
                type="primary"
                onClick={onSubmit}
                disabledReason={!onSubmit ? 'Please choose what you want to add and at what level' : undefined}
            >
                Add
            </LemonButton>
        </div>
    )
}
