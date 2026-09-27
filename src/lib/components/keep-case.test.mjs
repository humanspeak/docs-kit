import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { after, test } from 'node:test'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'

const keepCaseUrl = new URL('../../../dist/utils/keep-case.js', import.meta.url).href
const { keepsCase } = await import(keepCaseUrl)

// Keep generated modules beneath the package so Svelte resolves normally.
const output = await mkdtemp(new URL('../../../.svelte-kit/keep-case-test-', import.meta.url))
after(() => rm(output, { recursive: true, force: true }))

async function compileComponent(relativePath, filename, replacements) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
    let { code } = compile(source, { filename: relativePath, generate: 'server' }).js
    for (const [from, to] of replacements) code = code.replaceAll(from, to)
    await writeFile(`${output}/${filename}`, code)
    return { source, code }
}

test('keepsCase: camelCase and code punctuation keep their case; prose does not', () => {
    for (const s of [
        'createColumns',
        'TableViewModel',
        'addSortBy',
        'Table#createColumns: (columns) => Column[]',
        'attrs: () => Readable<Attrs>',
        'current: { attrs, props }',
        '`Render`',
        '$pageRows'
    ]) {
        assert.equal(keepsCase(s), true, s)
    }
    for (const s of [
        'Quick Start',
        'overview',
        'Migrating from 0.17.x',
        'Usage',
        '',
        undefined,
        null
    ]) {
        assert.equal(keepsCase(s), false, String(s))
    }
})

test('DocHeroCard keeps case for identifier titles only', async () => {
    await compileComponent('./DocHeroCard.svelte', 'Hero.mjs', [
        ['../utils/keep-case.js', keepCaseUrl]
    ])
    const { default: Hero } = await import(`${output}/Hero.mjs`)
    const ident = render(Hero, {
        props: { title: 'createColumns', slug: 'api', tagline: 't' }
    }).body
    const prose = render(Hero, { props: { title: 'Quick Start', slug: 'qs', tagline: 't' } }).body
    assert.ok(ident.includes('dk-keep-case'), 'identifier title gets dk-keep-case')
    assert.ok(!prose.includes('dk-keep-case'), 'prose title does not')
})

test('TableOfContentsV2 and SidebarV2 wire keepsCase to a dk-keep-case class', async () => {
    // Both components import SvelteKit `$app` and motion packages that do not
    // load under plain Node, so assert on source and compiled output instead of a render.
    for (const file of ['./TableOfContentsV2.svelte', './SidebarV2.svelte']) {
        const { source, code } = await compileComponent(file, `${file.slice(2, -7)}.mjs`, [])
        assert.ok(code.includes('keepsCase('), `${file} calls keepsCase`)
        assert.ok(code.includes('dk-keep-case'), `${file} emits the dk-keep-case class`)
        assert.ok(source.includes('.dk-keep-case {'), `${file} styles dk-keep-case`)
    }
})

test('prose-v2 headings do not lowercase code spans', async () => {
    const css = await readFile(new URL('../styles/prose-v2.css', import.meta.url), 'utf8')
    assert.match(css, /\.prose-v2 :is\(h1, h2, h3, h4, h5, h6\) code \{\s*text-transform: none;/)
})
