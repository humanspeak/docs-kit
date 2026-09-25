import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'

/** Render the site's existing square SVG mark, without inventing new branding. */
export async function renderFavicon(logo: string): Promise<Buffer> {
    const svg = await readFile(logo, 'utf8')
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: 192 } }).render()
    if (image.width !== image.height) throw new Error('The favicon source logo must be square')
    return image.asPng()
}

export async function generateFavicon(logo: string, output = 'static/favicon.png'): Promise<void> {
    await writeFile(output, await renderFavicon(logo))
}

/** Validate the actual SSR/prerendered head, not the source layout or browser DOM. */
export function faviconHref(html: string): string {
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]
    if (head === undefined) throw new Error('The page has no HTML head')
    const icons: string[] = []
    for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
        const attrs: Record<string, string> = {}
        for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
            attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4]
        }
        if (attrs.rel?.toLowerCase().split(/\s+/).includes('icon')) icons.push(attrs.href ?? '')
    }
    if (icons.length !== 1)
        throw new Error(`Expected one favicon declaration, found ${icons.length}`)
    if (icons[0] !== '/favicon.png') {
        throw new Error(`Expected the stable /favicon.png URL, received ${icons[0].slice(0, 100)}`)
    }
    return icons[0]
}

export function validatePng(png: Buffer): void {
    if (
        png.length < 33 ||
        !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        png.toString('ascii', 12, 16) !== 'IHDR'
    ) {
        throw new Error('The favicon response is not a PNG')
    }
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    if (width !== height || width <= 48) {
        throw new Error(`Expected a square favicon larger than 48px, received ${width}x${height}`)
    }
}

/** Verify a production preview or deployed site, including the bytes it serves. */
export async function checkFavicon({
    origin,
    logo,
    paths = ['/']
}: {
    origin: string
    logo: string
    paths?: string[]
}): Promise<void> {
    const expected = await renderFavicon(logo)
    for (const path of new Set(['/', ...paths])) {
        const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30_000) })
        if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
        const href = faviconHref(await response.text())
        const icon = await fetch(new URL(href, response.url), {
            signal: AbortSignal.timeout(30_000)
        })
        if (!icon.ok) throw new Error(`${href} returned HTTP ${icon.status}`)
        if (icon.headers.get('content-type')?.split(';')[0].trim() !== 'image/png') {
            throw new Error(`${href} must be served as image/png`)
        }
        const actual = Buffer.from(await icon.arrayBuffer())
        validatePng(actual)
        if (!actual.equals(expected)) {
            throw new Error(`${href} does not match ${logo}; regenerate the branded favicon`)
        }
    }
    console.log(
        'Favicon verified: stable URL, production HTML, PNG dimensions, and source branding'
    )
}
