import type { DocsKitConfig } from '../config.js'
import type { BlogPostMeta } from '../types/blog.js'

/**
 * Escapes special XML characters in a string.
 *
 * @param str - The string to escape.
 * @returns XML-safe string.
 */
const escapeXml = (str: string): string =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

/**
 * Generates an RSS 2.0 feed from blog posts and site configuration.
 *
 * @param posts - Array of blog post metadata (should already be sorted by date).
 * @param config - The DocsKitConfig for the site.
 * @param basePath - Base path for blog routes (defaults to '/blog').
 * @returns Valid RSS 2.0 XML string.
 */
export const generateRssFeed = (
    posts: BlogPostMeta[],
    config: DocsKitConfig,
    basePath = '/blog'
): string => {
    const items = posts
        .map(
            (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${config.url}${basePath}/${post.slug}</link>
      <guid isPermaLink="true">${config.url}${basePath}/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${escapeXml(post.author)}</author>${post.tags.map((t) => `\n      <category>${escapeXml(t)}</category>`).join('')}
    </item>`
        )
        .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.name)} Blog</title>
    <link>${config.url}${basePath}</link>
    <description>${escapeXml(config.description)}</description>
    <language>en</language>
    <atom:link href="${config.url}${basePath}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`
}
