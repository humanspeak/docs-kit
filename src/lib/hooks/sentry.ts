import type { Handle } from '@sveltejs/kit'

export interface SentryConfig {
    dsn: string | undefined
    environment?: string
    sendDefaultPii?: boolean
    tracesSampleRate?: number
    enableLogs?: boolean
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
