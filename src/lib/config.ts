export interface DocsKitConfig {
    /** Display name, e.g. 'Svelte Markdown' */
    name: string
    /** Short slug used in paths, e.g. 'markdown' */
    slug: string
    /** npm package name, e.g. '@humanspeak/svelte-markdown' */
    npmPackage: string
    /** GitHub repo in owner/name format, e.g. 'humanspeak/svelte-markdown' */
    repo: string
    /** Canonical site URL, e.g. 'https://markdown.svelte.page' */
    url: string
    /** Short description for SEO */
    description: string
    /** SEO keywords */
    keywords: string[]
    /** Default features shown on OG cards */
    defaultFeatures: string[]
    /** Fallback star count when GitHub API is unavailable */
    fallbackStars: number
}
