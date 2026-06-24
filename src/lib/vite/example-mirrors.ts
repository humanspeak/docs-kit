/**
 * Vite plugin: docs-kit interactive-example mirror generator.
 *
 * Walks `src/routes/examples/<slug>/+page.svelte` for docs-kit `ExampleV2`
 * pages, extracts their SEO copy, `ExampleSection[]` prose, note snippets,
 * and `demoCodeSample(...)` references, then writes LLM-friendly markdown
 * mirrors to:
 *
 *   - `static/examples.md`
 *   - `static/examples/<slug>.md`
 *
 * Each per-example mirror includes fenced Svelte source copied from
 * `src/lib/examples/<slug>/demos/*.svelte`, so coding agents can fetch
 * runnable examples without scraping the interactive UI.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve as resolvePath, sep } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

export interface ExampleMirrorsOptions {
    /** Public site URL used in source-attribution headers. Required. */
    siteUrl: string
    /** Filesystem root for scanning. When omitted, the plugin adopts
     *  Vite's resolved project root via `configResolved`. */
    root?: string
    /** Directory (relative to `root`) holding `/examples` routes. Default
     *  `src/routes/examples`. */
    examplesDir?: string
    /** Directory (relative to `root`) holding demo source files referenced
     *  by `demoCodeSample(...)`. Default `src/lib/examples`. */
    demoDir?: string
    /** Output directory (relative to `root`) for per-example mirrors.
     *  Default `static/examples`. */
    outputDir?: string
    /** Output file (relative to `root`) for the examples index mirror.
     *  Default `static/examples.md`. */
    indexOutput?: string
    /** Source page filename. Default `+page.svelte`. */
    pageFile?: string
    /** Canonical route for examples. Default `/examples`. */
    examplesRoute?: string
    /** Optional repository/source browser base URL. When set, source file
     *  references link to `${sourceBaseUrl}/${demoDir}/${sample}`. */
    sourceBaseUrl?: string
}

interface ResolvedOptions {
    siteUrl: string
    root: string
    examplesDir: string
    demoDir: string
    outputDir: string
    indexOutput: string
    pageFile: string
    examplesRoute: string
    sourceBaseUrl: string
}

interface ExampleIndexItem {
    slug: string
    title: string
    tag: string
    description: string
}

interface DemoCodeSample {
    key: string
    id: string
    label: string
}

interface ExampleSectionMirror {
    figId: string
    tag: string
    title: string
    description: string
    notes: string[]
    barCells: { key: string; value: string }[]
    samples: DemoCodeSample[]
}

interface ExamplePageMirror {
    slug: string
    title: string
    description: string
    sections: ExampleSectionMirror[]
}

function resolveOptions(opts: ExampleMirrorsOptions): ResolvedOptions {
    if (!opts.siteUrl) {
        throw new Error('[docs-kit:example-mirrors] `siteUrl` option is required')
    }

    return {
        siteUrl: opts.siteUrl.replace(/\/+$/, ''),
        root: opts.root ?? process.cwd(),
        examplesDir: opts.examplesDir ?? 'src/routes/examples',
        demoDir: opts.demoDir ?? 'src/lib/examples',
        outputDir: opts.outputDir ?? 'static/examples',
        indexOutput: opts.indexOutput ?? 'static/examples.md',
        pageFile: opts.pageFile ?? '+page.svelte',
        examplesRoute: `/${(opts.examplesRoute ?? '/examples').replace(/^\/+|\/+$/g, '')}`,
        sourceBaseUrl: opts.sourceBaseUrl?.replace(/\/+$/, '') ?? ''
    }
}

async function regenerateAll(opts: ResolvedOptions): Promise<number> {
    const examplesAbs = resolvePath(opts.root, opts.examplesDir)
    const outputAbs = resolvePath(opts.root, opts.outputDir)
    const indexOutputAbs = resolvePath(opts.root, opts.indexOutput)

    if (!existsSync(examplesAbs)) return 0

    const indexPath = join(examplesAbs, opts.pageFile)
    const indexSource = existsSync(indexPath) ? await readFile(indexPath, 'utf8') : ''
    const indexItems = indexSource ? parseExampleIndex(indexSource) : []
    const pages = await parseExamplePages({ examplesAbs, indexItems, pageFile: opts.pageFile })

    await rm(outputAbs, { force: true, recursive: true })
    await mkdir(outputAbs, { recursive: true })
    await mkdir(dirname(indexOutputAbs), { recursive: true })
    await writeFile(indexOutputAbs, renderExampleIndexMarkdown({ items: indexItems, pages, opts }))

    await Promise.all(
        pages.map(async (page) => {
            await writeFile(
                join(outputAbs, `${page.slug}.md`),
                await renderExamplePageMarkdown({ page, opts }),
                'utf8'
            )
        })
    )

    return pages.length
}

async function parseExamplePages({
    examplesAbs,
    indexItems,
    pageFile
}: {
    examplesAbs: string
    indexItems: ExampleIndexItem[]
    pageFile: string
}): Promise<ExamplePageMirror[]> {
    const routeSlugs = new Set(
        (await readdir(examplesAbs, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .filter((entry) => existsSync(join(examplesAbs, entry.name, pageFile)))
            .map((entry) => entry.name)
    )
    const orderedSlugs = [
        ...indexItems.map((item) => item.slug).filter((slug) => routeSlugs.has(slug)),
        ...Array.from(routeSlugs)
            .filter((slug) => !indexItems.some((item) => item.slug === slug))
            .sort()
    ]

    return Promise.all(
        orderedSlugs.map(async (slug) => {
            const source = await readFile(join(examplesAbs, slug, pageFile), 'utf8')
            return parseExamplePage({ slug, source })
        })
    )
}

function parseExampleIndex(source: string): ExampleIndexItem[] {
    const arraySource = extractConstArray(source, 'examples')
    const objects = splitTopLevelObjects(arraySource)

    return objects.map((objectSource) => ({
        slug: requiredStringField(objectSource, 'slug'),
        title: requiredStringField(objectSource, 'title'),
        tag: requiredStringField(objectSource, 'tag'),
        description: requiredStringField(objectSource, 'description')
    }))
}

function parseExamplePage({ slug, source }: { slug: string; source: string }): ExamplePageMirror {
    const snippets = parseSnippets(source)
    const pageTitle =
        optionalSeoString(source, 'h1') ??
        optionalSeoString(source, 'ogTitle') ??
        stripTitleSuffix(requiredSeoString(source, 'title'))
    const description = requiredSeoString(source, 'description')
    const sectionObjects = splitTopLevelObjects(extractConstArray(source, 'sections'))
    const sections = sectionObjects.map((objectSource) => {
        const notesName = optionalIdentifierField(objectSource, 'notes')
        const codeSnippetName = optionalIdentifierField(objectSource, 'codeSnippet')

        return {
            figId: requiredStringField(objectSource, 'figId'),
            tag: requiredStringField(objectSource, 'tag'),
            title: titleFromObject(requiredObjectField(objectSource, 'title')),
            description: requiredStringField(objectSource, 'description'),
            notes: notesName ? notesFromSnippet(snippets.get(notesName) ?? '') : [],
            barCells: parseBarCells(optionalArrayField(objectSource, 'barCells') ?? ''),
            samples: codeSnippetName ? parseCodeSamples(snippets.get(codeSnippetName) ?? '') : []
        }
    })

    return { slug, title: pageTitle, description, sections }
}

function parseSnippets(source: string): Map<string, string> {
    const snippets = new Map<string, string>()
    const snippetPattern = /\{#snippet\s+([A-Za-z_$][\w$]*)\(\)\}/g
    let match: RegExpExecArray | null

    while ((match = snippetPattern.exec(source))) {
        const name = match[1]
        const contentStart = match.index + match[0].length
        const contentEnd = source.indexOf('{/snippet}', contentStart)

        if (contentEnd === -1) {
            throw new Error(`[docs-kit:example-mirrors] Missing closing {/snippet} for ${name}`)
        }

        snippets.set(name, source.slice(contentStart, contentEnd))
        snippetPattern.lastIndex = contentEnd + '{/snippet}'.length
    }

    return snippets
}

function parseCodeSamples(source: string): DemoCodeSample[] {
    const samples: DemoCodeSample[] = []
    const callPattern = /demoCodeSample\(/g
    let match: RegExpExecArray | null

    while ((match = callPattern.exec(source))) {
        const argsStart = match.index + 'demoCodeSample'.length
        const argsSource = readBalanced(source, argsStart, '(', ')')
        const args = splitTopLevelArguments(argsSource)
            .slice(0, 3)
            .map((argument) => decodeStringLiteral(argument.trim()))

        if (args.length === 3) {
            const [key, id, label] = args
            samples.push({ key, id, label })
        }

        callPattern.lastIndex = argsStart + argsSource.length + 2
    }

    return samples
}

function notesFromSnippet(source: string): string[] {
    const notes: string[] = []
    const itemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/g
    let match: RegExpExecArray | null

    while ((match = itemPattern.exec(source))) {
        const note = htmlFragmentToMarkdown(match[1])
        if (note) notes.push(note)
    }

    return notes
}

function htmlFragmentToMarkdown(source: string): string {
    return normalizeInline(
        source
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<\s*[A-Z][A-Za-z0-9]*(?:\s[^>]*)?\/>/g, '')
            .replace(
                /<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/g,
                (_match, _quote: string, href: string, label: string) =>
                    `[${htmlFragmentToMarkdown(label)}](${href})`
            )
            .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/g, (_match, code: string) => {
                const cleanCode = normalizeInline(cleanSvelteStringExpression(stripTags(code)))
                return cleanCode ? `\`${cleanCode.replaceAll('`', '\\`')}\`` : ''
            })
            .replace(/<br\s*\/?>/g, ' ')
            .replace(/<\/p>|<\/div>|<\/span>/g, ' ')
            .replace(/<[^>]+>/g, ' ')
    )
}

function cleanSvelteStringExpression(source: string): string {
    const trimmed = decodeHtml(source).trim()
    const match = /^\{\s*(['"`])([\s\S]*)\1\s*\}$/.exec(trimmed)
    if (!match) return trimmed

    return decodeStringBody(match[2], match[1])
}

function parseBarCells(source: string): { key: string; value: string }[] {
    const cells: { key: string; value: string }[] = []
    const cellPattern = /\{\s*k:\s*(['"`])([\s\S]*?)\1\s*,\s*v:\s*(['"`])([\s\S]*?)\3\s*\}/g
    let match: RegExpExecArray | null

    while ((match = cellPattern.exec(source))) {
        cells.push({
            key: normalizeInline(decodeStringBody(match[2], match[1])),
            value: normalizeInline(decodeStringBody(match[4], match[3]))
        })
    }

    return cells
}

async function renderExamplePageMarkdown({
    page,
    opts
}: {
    page: ExamplePageMirror
    opts: ResolvedOptions
}): Promise<string> {
    const canonicalUrl = `${opts.siteUrl}${opts.examplesRoute}/${page.slug}`
    const mirrorUrl = `${canonicalUrl}.md`
    const lines = [
        `<!-- Source: ${canonicalUrl} -->`,
        '',
        `# ${page.title}`,
        '',
        `> ${page.description}`,
        '',
        `**Source:** [${canonicalUrl}](${canonicalUrl})`,
        '',
        `**Markdown mirror:** [${mirrorUrl}](${mirrorUrl})`,
        '',
        '---',
        '',
        'This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.',
        ''
    ]

    for (const section of page.sections) {
        lines.push(`## ${section.figId}: ${section.title}`, '', section.description, '')

        const metadata = [
            section.tag ? `tag: \`${section.tag}\`` : '',
            ...section.barCells.map((cell) => `${cell.key}: \`${cell.value}\``)
        ].filter(Boolean)

        if (metadata.length > 0) {
            lines.push(`**Metadata:** ${metadata.join(' | ')}`, '')
        }

        if (section.notes.length > 0) {
            lines.push('### Notes', '')
            for (const note of section.notes) {
                lines.push(`- ${note}`)
            }
            lines.push('')
        }

        if (section.samples.length > 0) {
            lines.push('### Source', '')
            for (const sample of section.samples) {
                const sourcePath = resolvePath(opts.root, opts.demoDir, sample.key)
                const source = await readFile(sourcePath, 'utf8')
                const sourceLabel = `${opts.demoDir}/${sample.key}`
                const sourceText = opts.sourceBaseUrl
                    ? `[${sourceLabel}](${opts.sourceBaseUrl}/${sourceLabel})`
                    : `\`${sourceLabel}\``

                lines.push(`#### ${sample.label}`, '', `Source file: ${sourceText}`, '')
                lines.push(codeFence(source, 'svelte'), '')
            }
        }
    }

    return ensureTrailingNewline(lines.join('\n'))
}

function renderExampleIndexMarkdown({
    items,
    pages,
    opts
}: {
    items: ExampleIndexItem[]
    pages: ExamplePageMirror[]
    opts: ResolvedOptions
}): string {
    const indexItems =
        items.length > 0
            ? items
            : pages.map((page) => ({
                  slug: page.slug,
                  title: page.title,
                  tag: 'EXAMPLE',
                  description: page.description
              }))
    const pageDescriptions = new Map(pages.map((page) => [page.slug, page.description]))
    const canonicalUrl = `${opts.siteUrl}${opts.examplesRoute}`
    const mirrorUrl = `${canonicalUrl}.md`
    const lines = [
        `<!-- Source: ${canonicalUrl} -->`,
        '',
        '# Interactive Examples',
        '',
        '> Live demos mirrored as markdown with runnable Svelte source for LLMs and agents.',
        '',
        `**Source:** [${canonicalUrl}](${canonicalUrl})`,
        '',
        `**Markdown mirror:** [${mirrorUrl}](${mirrorUrl})`,
        '',
        '---',
        '',
        'Each linked mirror includes the live page description, section notes, and fenced source for the demo components used on that page.',
        '',
        '## Examples',
        ''
    ]

    for (const item of indexItems) {
        const pageDescription = pageDescriptions.get(item.slug) ?? item.description
        const pageUrl = `${opts.siteUrl}${opts.examplesRoute}/${item.slug}`
        const pageMirrorUrl = `${pageUrl}.md`
        lines.push(
            `- [${item.title}](${pageMirrorUrl}) - ${pageDescription} (live: [${pageUrl}](${pageUrl}), tag: \`${item.tag}\`)`
        )
    }

    return ensureTrailingNewline(lines.join('\n'))
}

function codeFence(source: string, language: string): string {
    const backtickRuns = source.match(/`+/g) ?? []
    const fenceLength = Math.max(3, ...backtickRuns.map((run) => run.length + 1))
    const fence = '`'.repeat(fenceLength)

    return `${fence}${language}\n${source.trimEnd()}\n${fence}`
}

function extractConstArray(source: string, constName: string): string {
    const pattern = new RegExp(`const\\s+${constName}\\b[^=]*=\\s*\\[`)
    const match = pattern.exec(source)
    if (!match)
        throw new Error(`[docs-kit:example-mirrors] Could not find const ${constName} array`)

    return readBalanced(source, match.index + match[0].length - 1, '[', ']')
}

function splitTopLevelObjects(source: string): string[] {
    const objects: string[] = []
    let index = 0

    while (index < source.length) {
        const objectStart = source.indexOf('{', index)
        if (objectStart === -1) break

        const objectSource = readBalanced(source, objectStart, '{', '}')
        objects.push(objectSource)
        index = objectStart + objectSource.length + 2
    }

    return objects
}

function splitTopLevelArguments(source: string): string[] {
    const args: string[] = []
    let currentStart = 0
    let depth = 0
    let quote = ''
    let escaped = false
    let lineComment = false
    let blockComment = false

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index]
        const next = source[index + 1]

        if (lineComment) {
            if (char === '\n') lineComment = false
            continue
        }

        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                index += 1
            }
            continue
        }

        if (quote) {
            if (escaped) {
                escaped = false
            } else if (char === '\\') {
                escaped = true
            } else if (char === quote) {
                quote = ''
            }
            continue
        }

        if (char === '/' && next === '/') {
            lineComment = true
            index += 1
            continue
        }

        if (char === '/' && next === '*') {
            blockComment = true
            index += 1
            continue
        }

        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }

        if (char === '(' || char === '[' || char === '{') depth += 1
        if (char === ')' || char === ']' || char === '}') depth -= 1

        if (char === ',' && depth === 0) {
            args.push(source.slice(currentStart, index).trim())
            currentStart = index + 1
        }
    }

    const lastArg = source.slice(currentStart).trim()
    if (lastArg) args.push(lastArg)

    return args
}

function requiredStringField(source: string, field: string): string {
    return normalizeInline(decodeStringLiteral(requiredField(source, field)))
}

function optionalIdentifierField(source: string, field: string): string | undefined {
    const value = optionalField(source, field)
    if (!value) return undefined

    return /^[A-Za-z_$][\w$]*$/.test(value) ? value : undefined
}

function requiredObjectField(source: string, field: string): string {
    const value = requiredField(source, field)
    if (!value.startsWith('{'))
        throw new Error(`[docs-kit:example-mirrors] Field ${field} is not an object`)

    return readBalanced(value, 0, '{', '}')
}

function optionalArrayField(source: string, field: string): string | undefined {
    const value = optionalField(source, field)
    if (!value || !value.startsWith('[')) return undefined

    return readBalanced(value, 0, '[', ']')
}

function titleFromObject(source: string): string {
    return normalizeInline(
        ['prefix', 'accent', 'suffix', 'end']
            .map((field) => {
                const value = optionalField(source, field)
                return value ? decodeStringLiteral(value) : ''
            })
            .join('')
    )
}

function requiredSeoString(source: string, field: string): string {
    const value = optionalSeoString(source, field)
    if (!value) throw new Error(`[docs-kit:example-mirrors] Missing seo.${field}`)

    return value
}

function optionalSeoString(source: string, field: string): string | undefined {
    if (field === 'h1') {
        const h1Match = /seo\.h1\s*=\s*\{/.exec(source)
        if (!h1Match) return undefined

        const objectStart = h1Match.index + h1Match[0].length - 1
        const objectSource = readBalanced(source, objectStart, '{', '}')
        const title = optionalField(objectSource, 'title')
        return title ? normalizeInline(decodeStringLiteral(title)) : undefined
    }

    const match = new RegExp(`seo\\.${field}\\s*=`).exec(source)
    if (!match) return undefined

    const valueStart = skipWhitespace(source, match.index + match[0].length)
    return normalizeInline(decodeStringLiteral(readStringLiteral(source, valueStart)))
}

function requiredField(source: string, field: string): string {
    const value = optionalField(source, field)
    if (!value) throw new Error(`[docs-kit:example-mirrors] Missing field ${field}`)

    return value
}

function optionalField(source: string, field: string): string | undefined {
    const pattern = new RegExp(`\\b${field}\\s*:`)
    const match = pattern.exec(source)
    if (!match) return undefined

    const valueStart = skipWhitespace(source, match.index + match[0].length)
    const char = source[valueStart]

    if (char === '"' || char === "'" || char === '`') {
        return readStringLiteral(source, valueStart)
    }

    if (char === '{') {
        const content = readBalanced(source, valueStart, '{', '}')
        return `{${content}}`
    }

    if (char === '[') {
        const content = readBalanced(source, valueStart, '[', ']')
        return `[${content}]`
    }

    const scalarMatch = /^[A-Za-z_$][\w$]*/.exec(source.slice(valueStart))
    if (scalarMatch) return scalarMatch[0]

    return undefined
}

function readBalanced(source: string, openIndex: number, open: string, close: string): string {
    if (source[openIndex] !== open) {
        throw new Error(`[docs-kit:example-mirrors] Expected ${open} at index ${openIndex}`)
    }

    let depth = 0
    let quote = ''
    let escaped = false
    let lineComment = false
    let blockComment = false

    for (let index = openIndex; index < source.length; index += 1) {
        const char = source[index]
        const next = source[index + 1]

        if (lineComment) {
            if (char === '\n') lineComment = false
            continue
        }

        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                index += 1
            }
            continue
        }

        if (quote) {
            if (escaped) {
                escaped = false
            } else if (char === '\\') {
                escaped = true
            } else if (char === quote) {
                quote = ''
            }
            continue
        }

        if (char === '/' && next === '/') {
            lineComment = true
            index += 1
            continue
        }

        if (char === '/' && next === '*') {
            blockComment = true
            index += 1
            continue
        }

        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }

        if (char === open) depth += 1

        if (char === close) {
            depth -= 1
            if (depth === 0) return source.slice(openIndex + 1, index)
        }
    }

    throw new Error(`[docs-kit:example-mirrors] Missing closing ${close}`)
}

function readStringLiteral(source: string, start: number): string {
    const quote = source[start]
    let escaped = false

    for (let index = start + 1; index < source.length; index += 1) {
        const char = source[index]

        if (escaped) {
            escaped = false
        } else if (char === '\\') {
            escaped = true
        } else if (char === quote) {
            return source.slice(start, index + 1)
        }
    }

    throw new Error(`[docs-kit:example-mirrors] Missing closing quote for string at index ${start}`)
}

function decodeStringLiteral(source: string): string {
    const quote = source[0]
    if (quote !== '"' && quote !== "'" && quote !== '`') {
        throw new Error(
            `[docs-kit:example-mirrors] Expected string literal, got ${source.slice(0, 20)}`
        )
    }

    return decodeStringBody(source.slice(1, -1), quote)
}

function decodeStringBody(source: string, quote: string): string {
    return decodeHtml(
        source
            .replaceAll(`\\${quote}`, quote)
            .replaceAll('\\`', '`')
            .replaceAll("\\'", "'")
            .replaceAll('\\"', '"')
            .replaceAll('\\n', '\n')
            .replaceAll('\\r', '\r')
            .replaceAll('\\t', '\t')
            .replaceAll('\\\\', '\\')
    )
}

function stripTags(source: string): string {
    return source.replace(/<[^>]+>/g, ' ')
}

function decodeHtml(source: string): string {
    return source
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&apos;', "'")
        .replaceAll('&nbsp;', ' ')
}

function normalizeInline(source: string): string {
    return decodeHtml(source).replace(/\s+/g, ' ').trim()
}

function stripTitleSuffix(source: string): string {
    return source.replace(/\s*\|\s*Examples\s*\|.*$/i, '').trim()
}

function ensureTrailingNewline(source: string): string {
    return source.endsWith('\n') ? source : `${source}\n`
}

function skipWhitespace(source: string, start: number): number {
    let index = start
    while (/\s/.test(source[index] ?? '')) index += 1
    return index
}

function isWatched(absPath: string, opts: ResolvedOptions): boolean {
    const examplesAbs = resolvePath(opts.root, opts.examplesDir)
    const demoAbs = resolvePath(opts.root, opts.demoDir)

    if (absPath === join(examplesAbs, opts.pageFile)) return true
    if (absPath.startsWith(examplesAbs + sep) && absPath.endsWith(sep + opts.pageFile)) return true
    if (absPath.startsWith(demoAbs + sep) && absPath.endsWith('.svelte')) return true

    return false
}

/** Factory for the Vite plugin. */
export function exampleMirrorsPlugin(userOptions: ExampleMirrorsOptions): Plugin {
    const opts = resolveOptions(userOptions)

    return {
        name: 'docs-kit:example-mirrors',
        configResolved(config) {
            if (userOptions.root !== undefined) return
            opts.root = config.root
        },
        async buildStart() {
            await regenerateAll(opts)
        },
        configureServer(server: ViteDevServer) {
            const examplesAbs = resolvePath(opts.root, opts.examplesDir)
            const demoAbs = resolvePath(opts.root, opts.demoDir)

            server.watcher.add([examplesAbs, demoAbs])

            const onEvent = async (file: string) => {
                const abs = relative('', file) ? resolvePath(file) : file
                if (!isWatched(abs, opts)) return
                await regenerateAll(opts)
            }

            server.watcher.on('add', onEvent)
            server.watcher.on('change', onEvent)
            server.watcher.on('unlink', onEvent)
        }
    }
}
