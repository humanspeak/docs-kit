import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { docMirrorsPlugin, llmsPlugin } from '../../../dist/vite/index.js'

const SITE = 'https://example.test'

const runBuildStart = async (plugin) => {
    const hook = plugin.buildStart
    await (typeof hook === 'function' ? hook : hook.handler).call({})
}

const writePage = async (root, route, title) => {
    const dir = join(root, 'src/routes', route)
    await mkdir(dir, { recursive: true })
    await writeFile(
        join(dir, '+page.svx'),
        `---\ntitle: ${title}\n---\n\n# ${title}\n\nBody of ${title}.\n`
    )
}

const project = async () => {
    const root = await mkdtemp(join(tmpdir(), 'docs-kit-mirrors-'))
    await writePage(root, 'docs', 'Docs Home')
    await writePage(root, 'docs/overview', 'Overview')
    await writePage(root, 'docs/guides/moving-to-current', 'Moving to current')
    await writePage(root, 'docs/api/body-cell', 'BodyCell')
    await mkdir(join(root, 'src/lib'), { recursive: true })
    await writeFile(
        join(root, 'src/lib/sitemap-manifest.json'),
        JSON.stringify({
            '/docs': {},
            '/docs/overview': {},
            '/docs/guides/moving-to-current': {},
            '/docs/api/body-cell': {},
            '/': {}
        })
    )
    await runBuildStart(docMirrorsPlugin({ root, siteUrl: SITE }))
    return root
}

test('a nested page is mirrored at the path that matches its route', async () => {
    const root = await project()
    const nested = join(root, 'static/docs/guides/moving-to-current.md')
    assert.ok(existsSync(nested), 'guides/moving-to-current.md is written')
    assert.match(await readFile(nested, 'utf8'), /# Moving to current/)
    assert.match(await readFile(nested, 'utf8'), /docs\/guides\/moving-to-current/)
})

test('the flat legacy name is still written with identical content', async () => {
    const root = await project()
    const nested = await readFile(join(root, 'static/docs/api/body-cell.md'), 'utf8')
    const flat = await readFile(join(root, 'static/docs/api-body-cell.md'), 'utf8')
    assert.equal(flat, nested)
})

test('single-segment pages and the docs root keep one file each', async () => {
    const root = await project()
    assert.ok(existsSync(join(root, 'static/docs/overview.md')))
    assert.ok(existsSync(join(root, 'static/docs/index.md')))
})

test('every markdown link in llms.txt points at a mirror that exists', async () => {
    const root = await project()
    await runBuildStart(llmsPlugin({ root, siteUrl: SITE, pkgName: '@example/ours' }))
    const index = await readFile(join(root, 'static/llms.txt'), 'utf8')
    const links = [...index.matchAll(/\]\((https:\/\/example\.test\/docs[^)]*\.md)\)/g)].map(
        (m) => m[1]
    )
    assert.equal(links.length, 4)
    for (const link of links) {
        const file = join(root, 'static', link.slice(SITE.length))
        assert.ok(existsSync(file), `${link} resolves to a file under static/`)
    }
    assert.ok(links.includes(`${SITE}/docs/guides/moving-to-current.md`))
    assert.ok(links.includes(`${SITE}/docs/index.md`))
})
