/** Metadata for a blog post (used in index listings, no content body). */
export interface BlogPostMeta {
    /** URL-safe slug derived from filename */
    slug: string
    /** Post title from frontmatter */
    title: string
    /** ISO 8601 date string */
    date: string
    /** Short description / excerpt for SEO and index cards */
    description: string
    /** Categorization tags */
    tags: string[]
    /** Author name (defaults to 'Humanspeak') */
    author: string
    /** If true, post is hidden in production */
    draft?: boolean
    /** Estimated reading time in minutes */
    readingTime: number
    /** Slug for social card generation (og-{ogSlug}.png) */
    ogSlug?: string
}

/** Full blog post data including the markdown body. */
export interface BlogPostData extends BlogPostMeta {
    /** Raw markdown content with frontmatter stripped */
    content: string
}
