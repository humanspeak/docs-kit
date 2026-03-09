import { createHash } from 'crypto'

import type { Handle } from '@sveltejs/kit'

const JSON_LD_REGEX = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

/**
 * Creates a handle that computes SHA-256 hashes for JSON-LD scripts
 * and appends them to the CSP script-src directive.
 *
 * SvelteKit's CSP hash mode cannot auto-hash {@html} content,
 * so this post-processes the response to add the hashes dynamically.
 *
 * Place first in sequence() so it wraps the full pipeline.
 *
 * Note: Disables response streaming for HTML pages with CSP headers
 * (must read full body to find JSON-LD blocks).
 */
export const createJsonLdCspHandle = (): Handle => {
    return async ({ event, resolve }) => {
        const response = await resolve(event)

        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('text/html')) return response

        const csp = response.headers.get('content-security-policy')
        if (!csp) return response

        const html = await response.text()

        const hashes = Array.from(html.matchAll(JSON_LD_REGEX), ([, content]) => {
            const hash = createHash('sha256').update(content).digest('base64')
            return `'sha256-${hash}'`
        })

        if (hashes.length === 0) return new Response(html, response)

        const newCsp = csp.replace(/script-src(?!-)([^;]*)/, `script-src$1 ${hashes.join(' ')}`)
        const newHeaders = new Headers(response.headers)
        newHeaders.set('content-security-policy', newCsp)

        return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        })
    }
}
