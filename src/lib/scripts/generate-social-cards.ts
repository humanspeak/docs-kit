import fs from 'fs/promises'
import path from 'path'

import { normalizeDimensionsForSatori } from '@humanspeak/svelte-satori-fix'
import { Resvg } from '@resvg/resvg-js'
import satori, { type Font } from 'satori'
import { html as toReactNode } from 'satori-html'

const CONCURRENCY = 8

// ---------- types ----------

type CardType = 'og' | 'twitter'

const CARD_DIMENSIONS: Record<CardType, { width: number; height: number }> = {
    og: { width: 1200, height: 630 },
    twitter: { width: 1200, height: 600 }
}

/**
 * Public type — one entry produces an `og-<slug>.png` and `twitter-<slug>.png`
 * pair in `static/social-cards/`. Exported so consumers (and the Vite plugin)
 * can build `extraPages` lists for routes whose `ogSlug` is constructed at
 * runtime and isn't visible to the static regex scan of `+page.svelte` —
 * `ComparisonPageV2` competitor pages are the canonical example.
 */
export interface PageSeoData {
    ogTitle: string
    ogTagline: string
    ogFeatures: string[]
    ogSlug: string
}

interface CardTask {
    type: CardType
    title: string
    description: string
    features: string[]
    filename: string
}

export interface GenerateSocialCardsOptions {
    /** npm package name, e.g. '@humanspeak/svelte-markdown' */
    npmPackage: string
    /** Default title for cards */
    defaultTitle: string
    /** Default description for cards */
    defaultDescription: string
    /** Default features shown on cards */
    defaultFeatures: string[]
    /** Root directory of the docs project (where src/ and static/ live) */
    rootDir: string
    /** @deprecated Fonts are now resolved from docs-kit's own package. This option is ignored. */
    fontsDir?: string
    /** Optional path to blog content directory (e.g. 'src/content/blog'). Enables OG cards for blog posts. */
    blogContentDir?: string
    /**
     * Pages whose `ogSlug` can't be derived from a static literal in
     * `+page.svelte` — typically routes rendered by a shared component
     * (e.g. `ComparisonPageV2`) that builds the slug from a prop. Each
     * entry produces one `og-<slug>.png` + `twitter-<slug>.png` pair.
     */
    extraPages?: PageSeoData[]
}

// ---------- HTML template (mirrors OG.svelte output) ----------

function buildOgHtml(opts: {
    type: CardType
    title: string
    description: string
    features: string[]
    npmPackage: string
    humanspeakSvgDataUri: string
    svelteSvgDataUri: string
}): string {
    const {
        type,
        title,
        description,
        features,
        npmPackage,
        humanspeakSvgDataUri,
        svelteSvgDataUri
    } = opts
    const dims = CARD_DIMENSIONS[type]
    const titleFontSize = type === 'og' ? '86px' : '78px'
    const displayFeatures = features.slice(0, 4)
    const displayTitle = title.toLowerCase()
    const figureLabel = type === 'og' ? 'FIG-001 / SOCIAL' : 'FIG-002 / SOCIAL'
    const sheetLabel = type === 'og' ? 'SHEET 01 / 01' : 'SHEET 02 / 02'
    const featureCells = displayFeatures
        .map(
            (feature, i) =>
                `<div style="box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 14px 16px; border-right: ${
                    i === displayFeatures.length - 1 ? '0' : '1px solid #1c2422'
                }; flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; color: #5a635f; font-size: 11px; line-height: 1; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';">
                        <span>NO ${String(i + 1).padStart(2, '0')}</span>
                        <span style="display: flex; width: 10px; height: 10px; border: 1px solid ${
                            i % 2 === 0 ? '#54dbbc' : '#5a635f'
                        }; background-color: ${i % 2 === 0 ? '#54dbbc' : 'transparent'};"></span>
                    </div>
                    <div style="color: #ededed; font-size: 17px; line-height: 1.2; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';">${feature}</div>
                </div>`
        )
        .join('')

    return `<div style="box-sizing: border-box; display: flex; position: relative; overflow: hidden; background-color: #06090a; color: #ededed; width: ${dims.width}px; height: ${dims.height}px; font-family: 'lato';">
    <div style="display: flex; position: absolute; top: 0; right: 0; width: 620px; height: 420px; background-image: radial-gradient(ellipse at top right, rgba(84, 219, 188, 0.16), rgba(84, 219, 188, 0) 62%);"></div>
    <div style="display: flex; position: absolute; top: 34px; right: 34px; bottom: 34px; left: 34px; border: 1px solid #2a332f;"></div>
    <div style="display: flex; position: absolute; top: 26px; left: 26px; width: 16px; height: 16px; border-top: 2px solid #54dbbc; border-left: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; top: 26px; right: 26px; width: 16px; height: 16px; border-top: 2px solid #54dbbc; border-right: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; bottom: 26px; left: 26px; width: 16px; height: 16px; border-bottom: 2px solid #54dbbc; border-left: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; right: 26px; bottom: 26px; width: 16px; height: 16px; border-right: 2px solid #54dbbc; border-bottom: 2px solid #54dbbc;"></div>
    <div style="box-sizing: border-box; display: flex; position: absolute; top: 34px; right: 34px; bottom: 34px; left: 34px; flex-direction: column; padding: 42px 50px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #1c2422; background-color: #0d1110; padding: 8px 15px; color: #9aa39f; font-size: 13px; line-height: 1; font-weight: 800; text-transform: uppercase; white-space: nowrap; font-family: 'lato-extrabold';">
                <span style="display: flex; width: 8px; height: 8px; background-color: #54dbbc;"></span>
                <span>${npmPackage}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; color: #5a635f; font-size: 11px; line-height: 1.8; font-weight: 800; text-align: right; text-transform: uppercase; font-family: 'lato-extrabold';">
                <span>${figureLabel}</span>
                <span style="color: #ededed;">${sheetLabel}</span>
                <span>SPRING · 2026</span>
            </div>
        </div>
        <h1 style="display: block; max-width: 820px; margin: auto 0 0; color: #ededed; font-size: ${titleFontSize}; line-height: 0.88; font-weight: 800; letter-spacing: 0; text-transform: lowercase; font-family: 'lato-extrabold';">${displayTitle}</h1>
        <p style="display: block; margin: 18px 0 26px; color: #9aa39f; font-size: 24px; line-height: 1.25; font-weight: 700; letter-spacing: 0; font-family: 'lato';">${description}</p>
        <div style="display: flex; width: 100%; border: 1px solid #1c2422;">
            ${featureCells}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 24px;">
            <div style="display: flex; align-items: center; gap: 14px; border: 1px solid #1c2422; background-color: #0d1110; padding: 12px 18px;">
                <img src="${humanspeakSvgDataUri}" width="30" height="30" style="width: 30px; height: 30px;" />
                <div style="display: flex; flex-direction: column; color: #5a635f; line-height: 1.25;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';">CREATED BY</span>
                    <span style="color: #ededed; font-size: 20px; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';">Humanspeak</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; border: 1px solid #1c2422; background-color: #0d1110; padding: 12px 18px;">
                <span style="display: flex; width: 26px; height: 26px; color: #54dbbc;">
                    <svg viewBox="0 0 107 128" width="26" height="31" fill="none">
                        <path d="M94.157 22.819c-10.4-14.885-30.94-19.297-45.792-9.835L22.282 29.608A29.92 29.92 0 0 0 8.764 49.65a31.5 31.5 0 0 0 3.108 20.231 30 30 0 0 0-4.477 11.183 31.9 31.9 0 0 0 5.448 24.116c10.402 14.887 30.942 19.297 45.791 9.835l26.083-16.624A29.92 29.92 0 0 0 98.235 78.35a31.53 31.53 0 0 0-3.105-20.232 30 30 0 0 0 4.474-11.182 31.88 31.88 0 0 0-5.447-24.116" fill="currentColor" />
                        <path d="M45.817 106.582a20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.503 18 18 0 0 1 .624-2.435l.49-1.498 1.337.981a33.6 33.6 0 0 0 10.203 5.098l.97.294-.09.968a5.85 5.85 0 0 0 1.052 3.878 6.24 6.24 0 0 0 6.695 2.485 5.8 5.8 0 0 0 1.603-.704L69.27 76.28a5.43 5.43 0 0 0 2.45-3.631 5.8 5.8 0 0 0-.987-4.371 6.24 6.24 0 0 0-6.698-2.487 5.7 5.7 0 0 0-1.6.704l-9.953 6.345a19 19 0 0 1-5.296 2.326 20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.502 18 18 0 0 1 8.13-12.052l26.081-16.623a19 19 0 0 1 5.3-2.329A20.72 20.72 0 0 1 83.42 29.66a19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-.624 2.435l-.49 1.498-1.337-.98a33.6 33.6 0 0 0-10.203-5.1l-.97-.294.09-.968a5.86 5.86 0 0 0-1.052-3.878 6.24 6.24 0 0 0-6.696-2.485 5.8 5.8 0 0 0-1.602.704L37.73 51.72a5.42 5.42 0 0 0-2.449 3.63 5.8 5.8 0 0 0 .986 4.372 6.24 6.24 0 0 0 6.698 2.486 5.8 5.8 0 0 0 1.602-.704l9.952-6.342a19 19 0 0 1 5.295-2.328 20.72 20.72 0 0 1 22.237 8.242 19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-8.13 12.053l-26.081 16.622a19 19 0 0 1-5.3 2.328" fill="#06090a" />
                    </svg>
                </span>
                <div style="display: flex; flex-direction: column; line-height: 1.25;">
                    <span style="color: #54dbbc; font-size: 10px; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';">BUILT FOR</span>
                    <span style="color: #ededed; font-size: 18px; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';">Svelte 5</span>
                </div>
            </div>
        </div>
    </div>
</div>`
}

// ---------- discover pages ----------

async function discoverPages(routesDir: string): Promise<PageSeoData[]> {
    const pages: PageSeoData[] = []

    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                await walk(full)
            } else if (entry.name.match(/^\+page\.(svelte|svx)$/)) {
                const content = await fs.readFile(full, 'utf-8')
                const slugMatch = content.match(/seo\.ogSlug\s*=\s*['"`]([^'"`]+)['"`]/)
                if (!slugMatch) continue

                const titleMatch = content.match(/seo\.ogTitle\s*=\s*['"`]([^'"`]+)['"`]/)
                const taglineMatch = content.match(/seo\.ogTagline\s*=\s*['"`]([^'"`]+)['"`]/)
                const featuresMatch = content.match(/seo\.ogFeatures\s*=\s*\[([^\]]+)\]/)

                const ogSlug = slugMatch[1]
                const ogTitle = titleMatch?.[1] ?? ogSlug
                const ogTagline = taglineMatch?.[1] ?? ''
                const ogFeatures = featuresMatch
                    ? featuresMatch[1]
                          .split(',')
                          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
                          .filter(Boolean)
                    : []

                pages.push({ ogSlug, ogTitle, ogTagline, ogFeatures })
            }
        }
    }

    await walk(routesDir)
    return pages
}

// ---------- generate a single card ----------

async function generateCard(
    task: CardTask,
    fonts: Font[],
    npmPackage: string,
    humanspeakSvgDataUri: string,
    svelteSvgDataUri: string,
    outDir: string
): Promise<void> {
    const dims = CARD_DIMENSIONS[task.type]

    const html = buildOgHtml({
        type: task.type,
        title: task.title,
        description: task.description,
        features: task.features,
        npmPackage,
        humanspeakSvgDataUri,
        svelteSvgDataUri
    })

    const element = normalizeDimensionsForSatori(toReactNode(html))
    const svg = await satori(element, {
        width: dims.width,
        height: dims.height,
        fonts
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: dims.width } })
    const image = resvg.render()
    const png = image.asPng()

    await fs.writeFile(path.join(outDir, task.filename), png)
}

// ---------- discover blog posts ----------

async function discoverBlogPosts(blogContentDir: string): Promise<PageSeoData[]> {
    const pages: PageSeoData[] = []

    try {
        const entries = await fs.readdir(blogContentDir, { withFileTypes: true })
        // Dynamic import — gray-matter is optional (only needed for raw .md blog posts)
        // @ts-ignore gray-matter may not be installed
        const matter = (await import('gray-matter')).default

        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.md')) continue
            const slug = entry.name.replace(/\.md$/, '')
            const content = await fs.readFile(path.join(blogContentDir, entry.name), 'utf-8')
            const { data } = matter(content)

            pages.push({
                ogSlug: data.ogSlug ?? `blog-${slug}`,
                ogTitle: data.title ?? slug,
                ogTagline: data.description ?? '',
                ogFeatures: Array.isArray(data.tags) ? data.tags.slice(0, 4).map(String) : []
            })
        }
    } catch {
        // Directory doesn't exist or can't be read — skip silently
    }

    return pages
}

// ---------- main ----------

/** Resolve the fonts directory bundled with @humanspeak/docs-kit */
function resolvePackageFontsDir(): string {
    const thisFile = new URL(import.meta.url).pathname
    // In dist: dist/scripts/generate-social-cards.js → dist/fonts/
    return path.join(path.dirname(thisFile), '..', 'fonts')
}

/** Resolve the SVG assets directory bundled with @humanspeak/docs-kit */
function resolvePackageSvgDir(): string {
    const thisFile = new URL(import.meta.url).pathname
    return path.join(path.dirname(thisFile), '..', 'assets', 'svg')
}

export async function generateSocialCards(options: GenerateSocialCardsOptions) {
    const {
        npmPackage,
        defaultTitle,
        defaultDescription,
        defaultFeatures,
        rootDir,
        blogContentDir,
        extraPages = []
    } = options
    const startTime = Date.now()

    // Load fonts from the package's own bundled font files
    const fontsDir = resolvePackageFontsDir()
    const [latoRegular, latoExtraBold, latoExtraBoldItalic] = await Promise.all([
        fs.readFile(path.join(fontsDir, 'lato/Lato-Regular.ttf')),
        fs.readFile(path.join(fontsDir, 'lato/Lato-ExtraBold.ttf')),
        fs.readFile(path.join(fontsDir, 'lato/Lato-ExtraBoldItalic.ttf'))
    ])

    const fonts: Font[] = [
        { name: 'lato', data: latoRegular, style: 'normal' },
        { name: 'lato-extrabold', data: latoExtraBold, style: 'normal' },
        { name: 'lato-extrabolditalic', data: latoExtraBoldItalic, style: 'italic' }
    ]

    // Load SVGs as data URIs for satori image embedding
    const svgDir = resolvePackageSvgDir()
    const [humanspeakSvg, svelteSvg] = await Promise.all([
        fs.readFile(path.join(svgDir, 'humanspeak-dark.svg')),
        fs.readFile(path.join(svgDir, 'svelte-logo.svg'))
    ])
    const humanspeakSvgDataUri = `data:image/svg+xml;base64,${humanspeakSvg.toString('base64')}`
    const svelteSvgDataUri = `data:image/svg+xml;base64,${svelteSvg.toString('base64')}`

    // Discover pages with SEO data
    const routesDir = path.join(rootDir, 'src/routes')
    const pages = await discoverPages(routesDir)

    // Discover blog posts if content directory is provided
    const blogDir = blogContentDir ? path.join(rootDir, blogContentDir) : null
    const blogPages = blogDir ? await discoverBlogPosts(blogDir) : []
    const allPages = [...pages, ...blogPages, ...extraPages]

    console.log(
        `Found ${pages.length} pages + ${blogPages.length} blog posts + ${extraPages.length} extras with social card data`
    )

    // Build task list
    const tasks: CardTask[] = []
    const socialCardsDir = path.join(rootDir, 'static/social-cards')

    // Default images (written to static/ root, not social-cards/)
    for (const type of ['og', 'twitter'] as CardType[]) {
        tasks.push({
            type,
            title: defaultTitle,
            description: defaultDescription,
            features: defaultFeatures,
            filename: `../${type}-default.png`
        })
    }

    // Per-page images
    for (const page of allPages) {
        for (const type of ['og', 'twitter'] as CardType[]) {
            tasks.push({
                type,
                title: page.ogTitle,
                description: page.ogTagline,
                features: page.ogFeatures,
                filename: `${type}-${page.ogSlug}.png`
            })
        }
    }

    console.log(`Generating ${tasks.length} social card images...`)

    await fs.mkdir(socialCardsDir, { recursive: true })

    // Process in batches
    let completed = 0
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY)
        await Promise.all(
            batch.map(async (task) => {
                await generateCard(
                    task,
                    fonts,
                    npmPackage,
                    humanspeakSvgDataUri,
                    svelteSvgDataUri,
                    socialCardsDir
                )
                completed++
                console.log(`  [${completed}/${tasks.length}] ${task.type}: ${task.title}`)
            })
        )
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone! Generated ${tasks.length} images in ${elapsed}s`)
}
