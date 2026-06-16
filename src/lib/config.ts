export interface DocsKitConfig {
    /** Display name, e.g. 'Svelte Markdown' */
    name: string
    /** Short slug used in paths, e.g. 'markdown' */
    slug: string
    /** npm package name, e.g. '@humanspeak/svelte-markdown' */
    npmPackage: string
    /** Optional override for the header npm icon URL */
    npmUrl?: string
    /**
     * Hide the npm icon in the header. Set this on sites that aren't
     * published as an npm package (e.g. a standalone product site) so the
     * header shows only the GitHub icon.
     */
    hideNpm?: boolean
    /**
     * Hide the brand logo/favicon image in the header, leaving just the
     * wordmark. Useful for sites that don't want a logo in the header chrome.
     */
    hideLogo?: boolean
    /** GitHub repo in owner/name format, e.g. 'humanspeak/svelte-markdown' */
    repo: string
    /** Optional override for the header GitHub icon URL */
    githubUrl?: string
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
    /** Software requirements for JSON-LD (defaults to 'Svelte 5') */
    softwareRequirements?: string
    /** Programming languages for JSON-LD */
    programmingLanguages?: string[]
}
