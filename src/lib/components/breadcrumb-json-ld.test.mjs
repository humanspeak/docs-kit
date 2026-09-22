import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { after, test } from 'node:test'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'

// Keep generated modules beneath the package so Svelte resolves normally.
// Both components use the same existing context module, including on the baseline.
const output = await mkdtemp(new URL('../../../.svelte-kit/breadcrumb-test-', import.meta.url))
after(() => rm(output, { recursive: true, force: true }))
const contextUrl = new URL('../../../dist/contexts/breadcrumb.js', import.meta.url).href

async function compileComponent(relativePath, filename, replacements) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
    let { code } = compile(source, { filename: relativePath, generate: 'server' }).js
    for (const [from, to] of replacements) code = code.replaceAll(from, to)
    await writeFile(`${output}/${filename}`, code)
}

await compileComponent('./BreadcrumbJsonLd.svelte', 'BreadcrumbJsonLd.mjs', [
    ['../contexts/breadcrumb.js', contextUrl]
])
await compileComponent('./fixtures/BreadcrumbJsonLd.test.svelte', 'Fixture.mjs', [
    ['../../contexts/breadcrumb.js', contextUrl],
    ['../BreadcrumbJsonLd.svelte', './BreadcrumbJsonLd.mjs']
])
const { default: Fixture } = await import(`${output}/Fixture.mjs`)

const config = { url: 'https://example.test' }
const home = { '@type': 'ListItem', position: 1, name: 'Home', item: `${config.url}/` }
const docs = { '@type': 'ListItem', position: 2, name: 'Docs', item: `${config.url}/docs` }

function renderTrail(breadcrumbs) {
    const context = breadcrumbs === undefined ? undefined : { breadcrumbs }
    const before = structuredClone(context)
    if (context) {
        context.breadcrumbs.forEach(Object.freeze)
        Object.freeze(context.breadcrumbs)
        Object.freeze(context)
    }
    const { head } = render(Fixture, { props: { config, context } })
    assert.deepEqual(context, before, 'serialization must preserve the UI context')
    const scripts = [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    if (!breadcrumbs?.length) {
        assert.equal(scripts.length, 0)
        assert.doesNotMatch(head, /BreadcrumbList/)
        return
    }
    assert.equal(scripts.length, 1)
    const schema = JSON.parse(scripts[0][1])
    assert.equal(schema['@context'], 'https://schema.org')
    assert.equal(schema['@type'], 'BreadcrumbList')
    assert.deepEqual(
        schema.itemListElement.map((item) => item.position),
        schema.itemListElement.map((_, index) => index + 1)
    )
    return schema.itemListElement
}

test('omits an unlinked grouping ancestor and retains the final current page', () => {
    assert.deepEqual(
        renderTrail([{ title: 'Docs', href: '/docs' }, { title: 'Renderers' }, { title: 'HTML' }]),
        [home, docs, { '@type': 'ListItem', position: 3, name: 'HTML' }]
    )
})

test('omits multiple unlinked ancestors, including an empty href', () => {
    assert.deepEqual(
        renderTrail([
            { title: 'Docs', href: '/docs' },
            { title: 'Advanced' },
            { title: 'Renderers', href: '' },
            { title: 'HTML' }
        ]),
        [home, docs, { '@type': 'ListItem', position: 3, name: 'HTML' }]
    )
})

test('preserves a linked final crumb', () => {
    assert.deepEqual(renderTrail([{ title: 'Docs', href: '/docs' }]), [home, docs])
})

test('preserves an already valid trail with an unlinked final crumb', () => {
    assert.deepEqual(
        renderTrail([{ title: 'Docs', href: '/docs' }, { title: 'Getting Started' }]),
        [home, docs, { '@type': 'ListItem', position: 3, name: 'Getting Started' }]
    )
})

test('retains a sole unlinked current page after Home', () => {
    assert.deepEqual(renderTrail([{ title: 'Docs' }]), [
        home,
        { '@type': 'ListItem', position: 2, name: 'Docs' }
    ])
})

test('emits no BreadcrumbList for empty or absent context', () => {
    renderTrail([])
    renderTrail(undefined)
})
