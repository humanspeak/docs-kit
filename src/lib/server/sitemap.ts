export type SitemapManifest = Record<string, string>

export interface SitemapEntry {
    loc: string
    lastmod: string
    changefreq: string
    priority: string
}

export interface CreateSitemapEntriesOptions {
    manifest: SitemapManifest
    siteUrl: string
    excludePrefixes?: string[]
    getChangefreq?: (route: string) => string
    getPriority?: (route: string) => string
}

export interface CreateSitemapResponseOptions extends CreateSitemapEntriesOptions {
    headers?: HeadersInit
}

const defaultExcludePrefixes = ['/social-cards']

function normalizeSiteUrl(siteUrl: string): string {
    return siteUrl.replace(/\/$/, '')
}

function normalizeRoute(route: string): string {
    return route === '' ? '/' : route.startsWith('/') ? route : `/${route}`
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function getDefaultPriority(route: string): string {
    if (route === '/') return '1.0'
    if (route === '/docs/getting-started' || route.startsWith('/docs/api/')) return '0.9'
    if (route.startsWith('/docs/')) return '0.8'
    if (route.startsWith('/examples')) return '0.7'
    return '0.5'
}

function getDefaultChangefreq(route: string): string {
    if (route === '/') return 'weekly'
    return 'monthly'
}

export function createSitemapEntries(options: CreateSitemapEntriesOptions): SitemapEntry[] {
    const {
        manifest,
        siteUrl,
        excludePrefixes = defaultExcludePrefixes,
        getChangefreq = getDefaultChangefreq,
        getPriority = getDefaultPriority
    } = options
    const base = normalizeSiteUrl(siteUrl)

    return Object.entries(manifest)
        .map(([route, lastmod]) => [normalizeRoute(route), lastmod] as const)
        .filter(([route]) => !excludePrefixes.some((prefix) => route.startsWith(prefix)))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([route, lastmod]) => ({
            loc: `${base}${route}`,
            lastmod,
            changefreq: getChangefreq(route),
            priority: getPriority(route)
        }))
}

export function createSitemapXml(options: CreateSitemapEntriesOptions): string {
    const entries = createSitemapEntries(options)
    const urls = entries
        .map(
            (entry) =>
                `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n    <priority>${escapeXml(entry.priority)}</priority>\n  </url>`
        )
        .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export function createSitemapResponse(options: CreateSitemapResponseOptions): Response {
    const { headers, ...xmlOptions } = options
    const xml = createSitemapXml(xmlOptions)

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'max-age=0, s-maxage=3600',
            ...headers
        }
    })
}
