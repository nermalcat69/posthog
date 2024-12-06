import './SessionReplay.scss'

import clsx from 'clsx'
import { BindLogic } from 'kea'

import { PanelFilters } from './panels/Filters'
import { PanelPlayback } from './panels/Playback'
import { PanelPlaylist } from './panels/Playlist'
import { PlayerInspector } from './player/inspector/PlayerInspector'
import {
    SessionRecordingPlaylistLogicProps,
    sessionRecordingsPlaylistLogic,
} from './playlist/sessionRecordingsPlaylistLogic'

export function PanelsUI(props: SessionRecordingPlaylistLogicProps): JSX.Element {
    const logicProps: SessionRecordingPlaylistLogicProps = {
        ...props,
        autoPlay: props.autoPlay ?? true,
    }

    return (
        <BindLogic logic={sessionRecordingsPlaylistLogic} props={logicProps}>
            <PanelLayout className="SessionReplay__layout">
                <PanelContainer primary={false} className="PanelLayout__secondary flex-col">
                    <Panel primary={false}>
                        <PanelFilters />
                    </Panel>
                    <Panel primary className="PanelLayout__playlist overflow-y-auto flex-1 border w-full">
                        <PanelPlaylist />
                    </Panel>
                </PanelContainer>

                <PanelContainer primary className="PanelLayout__primary">
                    <Panel primary className="PanelLayout__playback">
                        <PanelPlayback logicKey={props.logicKey} />
                    </Panel>
                    <Panel primary={false} className="PanelLayout__inspector flex flex-col">
                        <PlayerInspector />
                    </Panel>
                </PanelContainer>
            </PanelLayout>
        </BindLogic>
    )
}

function PanelLayout(props: Omit<PanelContainerProps, 'primary'>): JSX.Element {
    return <PanelContainer {...props} primary={false} />
}

type PanelContainerProps = {
    children: React.ReactNode
    primary: boolean
    className?: string
}

function PanelContainer({ children, primary, className }: PanelContainerProps): JSX.Element {
    return <div className={clsx('flex flex-wrap gap-2', primary && 'flex-1', className)}>{children}</div>
}

function Panel({
    className,
    primary,
    children,
}: {
    className?: string
    primary: boolean
    children: JSX.Element
}): JSX.Element {
    return <div className={clsx(className, primary && 'flex-1', 'border')}>{children}</div>
}
