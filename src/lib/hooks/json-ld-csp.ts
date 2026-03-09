import { createHash } from 'crypto'

import type { Handle } from '@sveltejs/kit'

// Matches inline <script> tags (with or without attributes, but NOT those with src="...")
const INLINE_SCRIPT_REGEX = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/g

/**
 * Creates a handle that computes SHA-256 hashes for all inline scripts
 * and appends any missing hashes to the CSP script-src directive.
 *
 * SvelteKit's CSP hash mode auto-hashes scripts it controls, but cannot
 * hash {@html}-injected scripts (JSON-LD, ModeWatcher, etc.). This handle
 * post-processes the response to find and hash all inline scripts, then
 * adds any hashes not already present in the CSP header.
 *
 * Note: Disables response streaming for HTML pages with CSP headers
 * (must read full body to find inline scripts).
 */
export const createJsonLdCspHandle = (): Handle => {
    return async ({ event, resolve }) => {
        const response = await resolve(event)

        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('text/html')) return response

        const csp = response.headers.get('content-security-policy')
        if (!csp) return response

        const html = await response.text()

        // Compute hashes for all inline scripts, keep only those not already in the CSP
        const newHashes: string[] = []
        for (const [, content] of html.matchAll(INLINE_SCRIPT_REGEX)) {
            if (!content.trim()) continue
            const hash = `'sha256-${createHash('sha256').update(content).digest('base64')}'`
            if (!csp.includes(hash)) {
                newHashes.push(hash)
            }
        }

        if (newHashes.length === 0) return new Response(html, response)

        const newCsp = csp.replace(/script-src(?!-)([^;]*)/, `script-src$1 ${newHashes.join(' ')}`)
        const newHeaders = new Headers(response.headers)
        newHeaders.set('content-security-policy', newCsp)

        return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        })
    }
}
