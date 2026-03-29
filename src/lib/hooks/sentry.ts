import type { Handle } from '@sveltejs/kit'

export interface SentryConfig {
    dsn: string | undefined
    environment?: string
    sendDefaultPii?: boolean
    tracesSampleRate?: number
    enableLogs?: boolean
}

export interface ClientSentryConfig {
    dsn: string | undefined
    environment?: string
    tracesSampleRate?: number
    replaysSessionSampleRate?: number
    replaysOnErrorSampleRate?: number
}

/**
 * Defers Sentry client-side initialization until the browser is idle.
 * Keeps the Sentry SDK out of the critical rendering path by using
 * dynamic import() inside requestIdleCallback.
 * Consumers must have @sentry/sveltekit installed.
 *
 * Usage in hooks.client.ts:
 * ```ts
 * import { createClientSentryInit } from '@humanspeak/docs-kit/hooks'
 * import type { HandleClientError } from '@sveltejs/kit'
 *
 * export const handleError: HandleClientError = ({ error }) => {
 *     console.error(error)
 * }
 *
 * createClientSentryInit(() => import('$env/dynamic/public'), {
 *     environment: 'production'
 * })
 * ```
 */
export const createClientSentryInit = (
    importEnv: () => Promise<{ env: Record<string, string | undefined> }>,
    config: Omit<ClientSentryConfig, 'dsn'> = {}
): void => {
    const schedule =
        'requestIdleCallback' in window
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 3000)

    schedule(async () => {
        try {
            const [Sentry, { env }] = await Promise.all([import('@sentry/sveltekit'), importEnv()])

            Sentry.init({
                dsn: env.PUBLIC_SENTRY_DSN,
                environment: config.environment ?? 'local',
                tracesSampleRate: config.tracesSampleRate ?? 1.0,
                replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.01,
                replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0,
                integrations: [Sentry.replayIntegration()]
            })
        } catch (e) {
            console.warn('Sentry initialization failed:', e)
        }
    })
}

/**
 * Creates a Sentry handle using @sentry/sveltekit's Cloudflare integration.
 * Consumers must have @sentry/sveltekit installed.
 *
 * Usage:
 * ```ts
 * import { createSentryHandle } from '@humanspeak/docs-kit/hooks'
 * import { initCloudflareSentryHandle, sentryHandle } from '@sentry/sveltekit'
 * import { sequence } from '@sveltejs/kit/hooks'
 *
 * const sentryHandles = createSentryHandle(initCloudflareSentryHandle, sentryHandle, {
 *     dsn: env.PUBLIC_SENTRY_DSN,
 *     environment: env.PUBLIC_ENVIRONMENT ?? 'local'
 * })
 * export const handle = sequence(...sentryHandles, securityHeaders)
 * ```
 */
export const createSentryHandle = (
    initCloudflareSentryHandle: (config: Record<string, unknown>) => Handle,
    sentryHandle: () => Handle,
    config: SentryConfig
): Handle[] => {
    return [
        initCloudflareSentryHandle({
            environment: config.environment ?? 'local',
            dsn: config.dsn,
            sendDefaultPii: config.sendDefaultPii ?? true,
            tracesSampleRate: config.tracesSampleRate ?? 1.0,
            enableLogs: config.enableLogs ?? true
        }),
        sentryHandle()
    ]
}
