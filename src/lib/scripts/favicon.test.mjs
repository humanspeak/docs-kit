import { Resvg } from '@resvg/resvg-js'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { crc32 } from 'node:zlib'
import {
    checkFavicon,
    faviconHref,
    renderFavicon,
    validatePng
} from '../../../dist/scripts/favicon.js'

const head = (links) => `<html><head>${links}</head><body></body></html>`
test('checks the rendered head and rejects unstable, missing, SVG, and duplicate icons', () => {
    assert.equal(faviconHref(head('<link href="/favicon.png" rel="icon">')), '/favicon.png')
    assert.equal(
        faviconHref(head("<link rel='shortcut icon' href='/favicon.png'>")),
        '/favicon.png'
    )
    for (const href of [
        'data:image/png;base64,abc',
        'blob:abc',
        '/logo.svg',
        './favicon.png',
        '/favicon.abc.png'
    ]) {
        assert.throws(() => faviconHref(head(`<link rel="icon" href="${href}">`)), /stable/)
    }
    assert.throws(() => faviconHref(head('')), /found 0/)
    assert.throws(
        () => faviconHref(head('<link rel="icon" href="/favicon.png">'.repeat(2))),
        /found 2/
    )
    assert.throws(() => faviconHref('<body><link rel="icon" href="/favicon.png"></body>'), /head/)
})

const svg = (color = 'green', width = 24, height = 24) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="24" height="24" fill="${color}"/></svg>`

test('rejects non-PNG, non-square, and undersized images', () => {
    assert.throws(() => validatePng(Buffer.from('<html>Not found</html>')), /not a PNG/)
    for (const [w, h] of [
        [48, 48],
        [192, 96]
    ]) {
        assert.throws(() => validatePng(new Resvg(svg('green', w, h)).render().asPng()), /square/)
    }
})

test('checks HTTP status, MIME type, nested routes, and source branding', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'docs-kit-favicon-'))
    t.after(() => rm(dir, { recursive: true, force: true }))
    const logo = join(dir, 'logo.svg')
    await writeFile(logo, svg())
    const png = await renderFavicon(logo)
    validatePng(png)
    let status = 200
    let contentType = 'image/png'
    let bytes = png
    const visited = []
    t.mock.method(globalThis, 'fetch', async (url) => {
        visited.push(url.pathname)
        const response =
            url.pathname === '/favicon.png'
                ? new Response(bytes, { status, headers: { 'content-type': contentType } })
                : new Response(head('<link rel="icon" href="/favicon.png">'))
        Object.defineProperty(response, 'url', { value: url.href })
        return response
    })
    const options = { origin: 'https://docs.example', logo, paths: ['/docs/nested'] }
    await checkFavicon(options)
    assert.ok(visited.includes('/'))
    assert.ok(visited.includes('/docs/nested'))
    // Different PNG bytes with identical visible pixels (e.g. lossless optimization).
    const data = Buffer.from('tEXtComment\0optimized')
    const chunk = Buffer.alloc(data.length + 8)
    chunk.writeUInt32BE(data.length - 4, 0)
    data.copy(chunk, 4)
    chunk.writeUInt32BE(crc32(data), chunk.length - 4)
    bytes = Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)])
    assert.notDeepEqual(bytes, png)
    await checkFavicon(options)
    status = 404
    await assert.rejects(checkFavicon(options), /HTTP 404/)
    status = 200
    contentType = 'text/html'
    await assert.rejects(checkFavicon(options), /image\/png/)
    contentType = 'image/png'
    bytes = new Resvg(svg('red'), { fitTo: { mode: 'width', value: 192 } }).render().asPng()
    await assert.rejects(checkFavicon(options), /does not match/)
    await writeFile(logo, svg('green', 24, 12))
    await assert.rejects(renderFavicon(logo), /square/)
})
