import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

import { createJsonLdCspHandle } from './json-ld-csp.js'
import { createSecurityHeadersHandle } from './security-headers.js'
import { createSentryHandle, type SentryConfig } from './sentry.js'

export interface DocsKitHandleOptions {
    /** Sentry config. Omit to skip Sentry integration. */
    sentry?: {
        config: SentryConfig
        /** The initCloudflareSentryHandle function from @sentry/sveltekit */
        initCloudflareSentryHandle: (config: Record<string, unknown>) => Handle
        /** The sentryHandle function from @sentry/sveltekit */
        sentryHandle: () => Handle
    }
    /** Additional handles to include in the sequence (e.g. i18n middleware) */
    extraHandles?: Handle[]
}

/**
 * Creates a single composed handle with all standard docs-kit middleware:
 * 1. JSON-LD CSP hashing (first, wraps full pipeline)
 * 2. Security headers
 * 3. Sentry (optional)
 * 4. Any extra handles
 *
 * Usage (minimal):
 * ```ts
 * import { createDocsKitHandle } from '@humanspeak/docs-kit/hooks'
 * export const handle = createDocsKitHandle()
 * ```
 *
 * Usage (with Sentry):
 * ```ts
 * import { createDocsKitHandle } from '@humanspeak/docs-kit/hooks'
 * import { initCloudflareSentryHandle, sentryHandle } from '@sentry/sveltekit'
 * export const handle = createDocsKitHandle({
 *     sentry: {
 *         config: { dsn: env.PUBLIC_SENTRY_DSN },
 *         initCloudflareSentryHandle,
 *         sentryHandle
 *     }
 * })
 * ```
 */
export const createDocsKitHandle = (options?: DocsKitHandleOptions): Handle => {
    const handles: Handle[] = [createJsonLdCspHandle(), createSecurityHeadersHandle()]

    if (options?.sentry) {
        const { config, initCloudflareSentryHandle, sentryHandle } = options.sentry
        handles.push(...createSentryHandle(initCloudflareSentryHandle, sentryHandle, config))
    }

    if (options?.extraHandles) {
        handles.push(...options.extraHandles)
    }

    return sequence(...handles)
}
