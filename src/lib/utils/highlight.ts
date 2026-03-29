import { createHighlighter, type Highlighter } from 'shiki'
import type { BlogPostData } from '../types/blog.js'

const SUPPORTED_LANGS = new Set([
    'javascript',
    'typescript',
    'svelte',
    'html',
    'css',
    'json',
    'bash',
    'shell',
    'ini',
    'text',
    'ts',
    'js',
    'env'
])

/** Normalise short aliases to canonical Shiki language IDs. */
const normaliseLang = (lang: string): string => {
    if (lang === 'ts') return 'typescript'
    if (lang === 'js') return 'javascript'
    if (lang === 'env') return 'text'
    return SUPPORTED_LANGS.has(lang) ? lang : 'text'
}

let highlighterPromise: Promise<Highlighter> | null = null

/** Lazily create a singleton Shiki highlighter instance. */
const getHighlighter = (): Promise<Highlighter> => {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ['github-light', 'one-dark-pro'],
            langs: [...SUPPORTED_LANGS].filter(
                (l) => l !== 'text' && l !== 'env' && l !== 'ts' && l !== 'js'
            )
        })
    }
    return highlighterPromise
}

/** Regex matching fenced code blocks in markdown: ```lang\n...code...\n``` */
const FENCED_CODE_RE = /```(\w*)\n([\s\S]*?)```/g

/**
 * Replaces fenced code blocks in markdown content with dual-theme Shiki HTML,
 * wrapped in `.shiki-container` for compatibility with `enhanceCodeBlocks`.
 */
const highlightContent = async (content: string): Promise<string> => {
    const hl = await getHighlighter()
    const matches = [...content.matchAll(FENCED_CODE_RE)]

    if (matches.length === 0) return content

    let result = content
    for (const match of matches.reverse()) {
        const [fullMatch, rawLang = 'text', code] = match
        const lang = normaliseLang(rawLang)

        const lightHtml = hl.codeToHtml(code, { lang, theme: 'github-light' })
        const darkHtml = hl.codeToHtml(code, { lang, theme: 'one-dark-pro' })

        const highlighted =
            `<div class="shiki-container" data-lang="${rawLang}">` +
            `<div class="shiki-light">${lightHtml}</div>` +
            `<div class="shiki-dark">${darkHtml}</div>` +
            `</div>`

        result =
            result.slice(0, match.index) +
            highlighted +
            result.slice(match.index! + fullMatch.length)
    }

    return result
}

/**
 * Pre-highlights all fenced code blocks in an array of blog posts using Shiki.
 * Call this in `+page.server.ts` after `loadBlogPosts` to get syntax-highlighted
 * code blocks that match the mdsvex dual-theme output.
 *
 * @param posts - Array of blog posts from `loadBlogPosts`.
 * @returns The same array with code blocks replaced by highlighted HTML.
 */
export const highlightBlogPosts = async (posts: BlogPostData[]): Promise<BlogPostData[]> => {
    return Promise.all(
        posts.map(async (post) => ({
            ...post,
            content: await highlightContent(post.content)
        }))
    )
}
