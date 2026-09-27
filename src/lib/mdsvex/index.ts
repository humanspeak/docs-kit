import { keepsCase } from '../utils/keep-case.js'

/** Minimal hast node shape; enough to walk headings without a hast dependency. */
interface HastNode {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

const HEADING = /^h[1-6]$/

const textOf = (node: HastNode): string => {
    if (node.type === 'text') return node.value ?? ''
    return (node.children ?? []).map(textOf).join('')
}

const addClass = (node: HastNode, className: string) => {
    const props = (node.properties ??= {})
    const existing = props.className
    const list = Array.isArray(existing)
        ? existing.map(String)
        : typeof existing === 'string'
          ? existing.split(/\s+/).filter(Boolean)
          : []
    if (!list.includes(className)) list.push(className)
    props.className = list
}

/**
 * Rehype plugin: tags markdown headings whose text is a code identifier or a
 * signature (see `keepsCase`) with the `dk-keep-case` class, so the brutalist
 * theme's lowercase heading rule leaves their authored casing alone. Runs at
 * build time, so server-rendered HTML is already correct.
 *
 * @example
 * ```js
 * // svelte.config.js
 * import { rehypeKeepCase } from '@humanspeak/docs-kit/mdsvex'
 * mdsvex({ rehypePlugins: [rehypeKeepCase()] })
 * ```
 */
export const rehypeKeepCase = () => (tree: HastNode) => {
    const visit = (node: HastNode) => {
        if (node.type === 'element' && node.tagName && HEADING.test(node.tagName)) {
            if (keepsCase(textOf(node))) addClass(node, 'dk-keep-case')
        }
        for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
}
