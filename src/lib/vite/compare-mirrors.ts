import { existsSync } from 'node:fs'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

import type { ComparisonOurs, Competitor } from '../types/compare.js'

export interface ComparisonsOptions {
    ours: ComparisonOurs
    competitors: Competitor[]
    priority?: string[]
    /** Output directory relative to the Vite root. Default `static/compare`. */
    outputDir?: string
}

function normalized(value: string): string {
    return value
        .replace(/\r\n?/g, '\n')
        .replace(/\s*\n\s*/g, ' ')
        .trim()
}

function table(value: string | boolean | undefined): string {
    if (value === undefined) return ''
    const text = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : normalized(value)
    return text.replace(/\|/g, '\\|')
}

function bullets(items: string[]): string {
    return items.length > 0
        ? items.map((item) => `- ${normalized(item)}`).join('\n')
        : '- None listed.'
}

function assertSlug(slug: string): void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
        throw new Error(`[docs-kit:llms] invalid comparison slug "${slug}"`)
    }
}

export function orderCompetitors(competitors: Competitor[], priority: string[] = []): Competitor[] {
    const bySlug = new Map<string, Competitor>()
    for (const competitor of competitors) {
        assertSlug(competitor.slug)
        if (bySlug.has(competitor.slug)) {
            throw new Error(`[docs-kit:llms] duplicate competitor slug "${competitor.slug}"`)
        }
        bySlug.set(competitor.slug, competitor)
    }

    const named = new Set<string>()
    for (const slug of priority) {
        if (named.has(slug)) {
            throw new Error(`[docs-kit:llms] duplicate priority slug "${slug}"`)
        }
        if (!bySlug.has(slug)) {
            throw new Error(`[docs-kit:llms] unknown priority slug "${slug}"`)
        }
        named.add(slug)
    }

    return [
        ...priority.map((slug) => bySlug.get(slug)!),
        ...competitors.filter(({ slug }) => !named.has(slug))
    ]
}

function competitorMirror(ours: ComparisonOurs, competitor: Competitor): string {
    const canonical = `${ours.url.replace(/\/+$/, '')}/compare/${competitor.slug}`
    const metadata = [
        `- **${ours.name} site:** ${ours.url}`,
        `- **${ours.name} npm:** https://www.npmjs.com/package/${encodeURIComponent(ours.npmPackage)}`,
        `- **${ours.name} slug:** ${ours.slug}`,
        `- **Category:** ${normalized(competitor.type)}`,
        `- **Approach:** ${normalized(competitor.approach)}`,
        competitor.website ? `- **Website:** ${competitor.website}` : '',
        competitor.github ? `- **GitHub:** ${competitor.github}` : '',
        competitor.npm
            ? `- **npm:** https://www.npmjs.com/package/${encodeURIComponent(competitor.npm)}`
            : ''
    ].filter(Boolean)
    const features = competitor.features.map(
        (feature) =>
            `| ${table(feature.name)} | ${table(feature.us)} | ${table(feature.them)} | ${table(feature.note)} |`
    )

    return [
        `<!-- Source: ${canonical} -->`,
        `<!-- Canonical: ${canonical} -->`,
        `# ${ours.name} vs ${competitor.name}`,
        '',
        normalized(competitor.tagline),
        '',
        '## Overview',
        '',
        normalized(competitor.description),
        '',
        ...metadata,
        '',
        '## Feature comparison',
        '',
        `| Feature | ${table(ours.npmPackage)} | ${table(competitor.name)} | Notes |`,
        '| --- | --- | --- | --- |',
        ...features,
        '',
        `## ${ours.name} strengths`,
        '',
        bullets(competitor.prosUs),
        '',
        `## ${competitor.name} strengths`,
        '',
        bullets(competitor.prosThem),
        '',
        `## ${ours.name} limitations`,
        '',
        bullets(competitor.consUs),
        '',
        `## ${competitor.name} limitations`,
        '',
        bullets(competitor.consThem),
        '',
        '## Verdict',
        '',
        normalized(competitor.verdict),
        '',
        '## Keywords',
        '',
        competitor.keywords.map(table).join(', '),
        ''
    ].join('\n')
}

export function buildComparisonMirrors(options: ComparisonsOptions): Map<string, string> {
    const ordered = orderCompetitors(options.competitors, options.priority)
    const base = options.ours.url.replace(/\/+$/, '')
    const index = [
        `<!-- Source: ${base}/compare -->`,
        `<!-- Canonical: ${base}/compare -->`,
        '# Comparisons',
        '',
        `Compare ${options.ours.name} with alternative libraries.`,
        '',
        ...ordered.map(
            (competitor) =>
                `- [${competitor.name}](${base}/compare/${competitor.slug}.md): ${base}/compare/${competitor.slug}`
        ),
        ''
    ].join('\n')
    const mirrors = new Map<string, string>([['index.md', index]])
    for (const competitor of ordered) {
        mirrors.set(`${competitor.slug}.md`, competitorMirror(options.ours, competitor))
    }
    return mirrors
}

export async function writeComparisonMirrors(
    root: string,
    options: ComparisonsOptions
): Promise<void> {
    const outputAbs = resolvePath(root, options.outputDir ?? 'static/compare')
    const mirrors = buildComparisonMirrors(options)
    await mkdir(outputAbs, { recursive: true })
    if (existsSync(outputAbs)) {
        const files = await readdir(outputAbs, { withFileTypes: true })
        await Promise.all(
            files
                .filter(
                    (file) => file.isFile() && file.name.endsWith('.md') && !mirrors.has(file.name)
                )
                .map((file) => rm(resolvePath(outputAbs, file.name)))
        )
    }
    await Promise.all(
        [...mirrors].map(([file, body]) => writeFile(resolvePath(outputAbs, file), body, 'utf8'))
    )
}
