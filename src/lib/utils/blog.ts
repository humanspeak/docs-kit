import matter from 'gray-matter'
import type { BlogPostData, BlogPostMeta } from '../types/blog.js'
import { estimateReadingTime } from './reading-time.js'

/**
 * Parses a raw markdown file (with YAML frontmatter) into structured blog post data.
 *
 * @param slug - The URL-safe slug (typically the filename without extension).
 * @param rawContent - The full markdown file content including frontmatter.
 * @param includeDrafts - Whether to include draft posts (defaults to false).
 * @returns Parsed blog post data, or null if the post is a draft and includeDrafts is false.
 */
export const parseBlogPost = (
    slug: string,
    rawContent: string,
    includeDrafts = false
): BlogPostData | null => {
    const { data, content } = matter(rawContent)

    const isDraft = data.draft === true
    if (isDraft && !includeDrafts) return null

    const post: BlogPostData = {
        slug,
        title: data.title ?? slug,
        date: data.date instanceof Date ? data.date.toISOString() : String(data.date ?? ''),
        description: data.description ?? '',
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        author: data.author ?? 'Humanspeak',
        draft: isDraft || undefined,
        readingTime: estimateReadingTime(content),
        ogSlug: data.ogSlug ?? `blog-${slug}`,
        content
    }

    return post
}

/**
 * Loads and parses all blog posts from a Vite import.meta.glob result.
 *
 * @param globResult - Result of `import.meta.glob('/src/content/blog/*.md', { eager: true, query: '?raw', import: 'default' })`.
 * @param includeDrafts - Whether to include draft posts (defaults to false).
 * @returns Array of blog posts sorted by date (newest first).
 */
export const loadBlogPosts = (
    globResult: Record<string, string>,
    includeDrafts = false
): BlogPostData[] => {
    const posts: BlogPostData[] = []

    for (const [filepath, rawContent] of Object.entries(globResult)) {
        const slug = filepath.split('/').pop()?.replace(/\.md$/, '')
        if (!slug) continue

        const post = parseBlogPost(slug, rawContent, includeDrafts)
        if (post) posts.push(post)
    }

    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Filters blog posts by a specific tag.
 *
 * @param posts - Array of blog post metadata.
 * @param tag - Tag to filter by (case-insensitive).
 * @returns Filtered array of posts containing the specified tag.
 */
export const filterByTag = (posts: BlogPostMeta[], tag: string): BlogPostMeta[] => {
    const lower = tag.toLowerCase()
    return posts.filter((p) => p.tags.some((t) => t.toLowerCase() === lower))
}

/**
 * Extracts all unique tags from a list of blog posts, sorted by frequency (most used first).
 *
 * @param posts - Array of blog post metadata.
 * @returns Array of unique tag strings.
 */
export const getAllTags = (posts: BlogPostMeta[]): string[] => {
    const counts = new Map<string, number>()
    for (const post of posts) {
        for (const tag of post.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
}
