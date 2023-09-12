import { Link } from 'lib/lemon-ui/Link'
import { JSSnippet } from 'lib/components/JSSnippet'
import { LemonDivider } from 'lib/lemon-ui/LemonDivider'
import { CodeSnippet, Language } from 'lib/components/CodeSnippet'
import { useValues } from 'kea'
import { teamLogic } from 'scenes/teamLogic'

function JSInstallSnippet(): JSX.Element {
    return (
        <CodeSnippet language={Language.Bash}>
            {['npm install posthog-js', '# OR', 'yarn add posthog-js', '# OR', 'pnpm add posthog-js'].join('\n')}
        </CodeSnippet>
    )
}

function JSSetupSnippet(): JSX.Element {
    const { currentTeam } = useValues(teamLogic)

    return (
        <CodeSnippet language={Language.JavaScript}>
            {[
                "import posthog from 'posthog-js'",
                '',
                `posthog.init('${currentTeam?.api_token}', { api_host: '${window.location.origin}' })`,
            ].join('\n')}
        </CodeSnippet>
    )
}

function JSEventSnippet(): JSX.Element {
    return (
        <CodeSnippet language={Language.JavaScript}>{`posthog.capture('my event', { property: 'value' })`}</CodeSnippet>
    )
}

export function JSWebInstructions(): JSX.Element {
    return (
        <>
            <div className="flex items-center">
                <h3>Option 1. Code snippet</h3>
                <div
                    style={{
                        marginLeft: 10,
                        padding: 4,
                        backgroundColor: 'var(--mark)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--primary-alt)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        textAlign: 'center',
                    }}
                    color="orange"
                >
                    Recommended
                </div>
            </div>
            <p>
                Just add this snippet to your website and we'll automatically capture page views, sessions and all
                relevant interactions within your website.{' '}
                <Link
                    to="https://posthog.com/product-features/event-autocapture?utm_medium=in-product&utm_campaign=ingestion-web"
                    target="_blank"
                >
                    Learn more
                </Link>
                .
            </p>
            <h4>Install the snippet</h4>
            <p>
                Insert this snippet in your website within the <code>&lt;head&gt;</code> tag. <JSSnippet />
            </p>
            <h4>Send events </h4>
            <p>Visit your site and click around to generate some initial events.</p>
            <LemonDivider thick dashed className="my-4" />
            <div className="flex items-center">
                <h2>Option 2. Javascript Library</h2>
            </div>
            <p>
                Use this option if you want more granular control of how PostHog runs in your website and the events you
                capture. Recommended for teams with more stable products and more defined analytics requirements.{' '}
                <Link
                    to="https://posthog.com/docs/integrate/client/js/?utm_medium=in-product&utm_campaign=ingestion-web"
                    target="_blank"
                >
                    Learn more
                </Link>
                .
            </p>
            <h4>Install the package</h4>
            <JSInstallSnippet />
            <h4>
                Configure &amp; initialize (see more{' '}
                <Link to="https://posthog.com/docs/integrations/js-integration#config" target="_blank">
                    configuration options
                </Link>
                )
            </h4>
            <JSSetupSnippet />
            <h4>Send your first event</h4>
            <JSEventSnippet />
        </>
    )
}
