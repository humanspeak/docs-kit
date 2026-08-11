import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
    buildComparisonMirrors,
    orderCompetitors,
    writeComparisonMirrors
} from '../../../dist/vite/compare-mirrors.js'
import { llmsFullPlugin, llmsPlugin } from '../../../dist/vite/index.js'

const ours = {
    name: 'Our | Library',
    npmPackage: '@example/ours',
    slug: 'ours',
    url: 'https://example.test'
}

const competitors = [
    {
        slug: 'small',
        name: 'Small List',
        tagline: 'Small\r\nlist',
        description: 'A small | focused list.',
        website: 'https://small.test',
        github: 'https://github.com/example/small',
        npm: '@example/small',
        type: 'Svelte | component',
        approach: 'Measure\nthings',
        features: [
            { name: 'Dynamic | height', us: true, them: false, note: 'At\nruntime' },
            { name: 'Mode', us: 'Automatic | measured', them: 'Explicit' }
        ],
        prosUs: ['Fast'],
        prosThem: ['Tiny'],
        consUs: ['More code'],
        consThem: ['Needs | sizes'],
        verdict: 'Choose based\non needs.',
        keywords: ['virtual list', 'small | comparison']
    },
    {
        slug: 'popular',
        name: 'Popular List',
        tagline: 'Popular option',
        description: 'The popular choice.',
        type: 'Library',
        approach: 'Adapter API',
        features: [],
        prosUs: [],
        prosThem: [],
        consUs: [],
        consThem: [],
        verdict: 'Both are useful.',
        keywords: []
    }
]

async function runBuildStart(plugin) {
    const hook = plugin.buildStart
    assert.equal(typeof hook, 'function')
    await hook.call({})
}

test('orders named competitors first and rejects invalid priority slugs', () => {
    assert.deepEqual(
        orderCompetitors(competitors, ['popular']).map(({ slug }) => slug),
        ['popular', 'small']
    )
    assert.throws(
        () => orderCompetitors(competitors, ['missing']),
        /\[docs-kit:llms\].*unknown.*missing/i
    )
    assert.throws(
        () => orderCompetitors(competitors, ['popular', 'popular']),
        /\[docs-kit:llms\].*duplicate.*popular/i
    )
})

test('serializes complete, escaped, normalized, self-contained mirrors', () => {
    const mirrors = buildComparisonMirrors({ ours, competitors, priority: ['popular'] })
    assert.deepEqual([...mirrors.keys()], ['index.md', 'popular.md', 'small.md'])
    const page = mirrors.get('small.md')
    assert.match(page, /<!-- Source: https:\/\/example\.test\/compare\/small -->/)
    assert.match(page, /# Our \| Library vs Small List/)
    assert.match(page, /Small list/)
    assert.match(page, /https:\/\/small\.test/)
    assert.match(page, /https:\/\/example\.test/)
    assert.match(page, /%40example%2Fours/)
    assert.match(page, /\*\*Our \| Library slug:\*\* ours/)
    assert.match(page, /https:\/\/github\.com\/example\/small/)
    assert.match(page, /https:\/\/www\.npmjs\.com\/package\/%40example%2Fsmall/)
    assert.match(page, /\| Dynamic \\\| height \| Yes \| No \| At runtime \|/)
    assert.match(page, /## Our \| Library strengths/)
    assert.match(page, /## Small List limitations/)
    assert.match(page, /Choose based on needs\./)
    assert.match(page, /small \\\| comparison/)
    assert.doesNotMatch(page, /\r/)
})

test('writer removes stale markdown pages but preserves unrelated files and directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'docs-kit-compare-'))
    const outputDir = join(root, 'static/compare')
    await mkdir(join(outputDir, 'assets'), { recursive: true })
    await writeFile(join(outputDir, 'stale.md'), 'stale')
    await writeFile(join(outputDir, 'keep.txt'), 'keep')
    await writeComparisonMirrors(root, { ours, competitors, outputDir: 'static/compare' })
    assert.deepEqual((await readdir(outputDir)).sort(), [
        'assets',
        'index.md',
        'keep.txt',
        'popular.md',
        'small.md'
    ])
})

test('single llms comparisons input writes mirrors and md discovery links with html notes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'docs-kit-llms-'))
    const plugin = llmsPlugin({
        root,
        siteUrl: 'https://example.test',
        pkgName: '@example/ours',
        comparisons: { ours, competitors, priority: ['popular'] }
    })
    await runBuildStart(plugin)
    const index = await readFile(join(root, 'static/llms.txt'), 'utf8')
    assert.match(index, /## Comparisons/)
    assert.ok(index.indexOf('/compare/popular.md') < index.indexOf('/compare/small.md'))
    assert.match(
        index,
        /\[Popular List\]\(https:\/\/example\.test\/compare\/popular\.md\): https:\/\/example\.test\/compare\/popular/
    )
    assert.match(
        await readFile(join(root, 'static/compare/small.md'), 'utf8'),
        /# Our \| Library vs Small List/
    )
})

test('llms-full appends comparison index and pages after docs with a boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'docs-kit-full-'))
    await mkdir(join(root, 'static/docs'), { recursive: true })
    await writeFile(join(root, 'static/docs/start.md'), '<!-- Source: docs -->\n# Start\n')
    await writeComparisonMirrors(root, { ours, competitors, outputDir: 'static/compare' })
    await runBuildStart(
        llmsFullPlugin({ root, siteUrl: 'https://example.test', pkgName: '@example/ours' })
    )
    const full = await readFile(join(root, 'static/llms-full.txt'), 'utf8')
    assert.ok(full.indexOf('# Start') < full.indexOf('<!-- Comparison mirrors -->'))
    assert.ok(full.indexOf('<!-- Comparison mirrors -->') < full.indexOf('# Comparisons'))
    assert.match(full, /# Our \| Library vs Small List/)
})

test('omitting comparisons preserves the existing llms output shape', async () => {
    const root = await mkdtemp(join(tmpdir(), 'docs-kit-legacy-'))
    await runBuildStart(
        llmsPlugin({ root, siteUrl: 'https://example.test', pkgName: '@example/ours' })
    )
    assert.equal(
        await readFile(join(root, 'static/llms.txt'), 'utf8'),
        '# @example/ours\n\nCanonical docs root: https://example.test/docs\nPer-page markdown mirrors: https://example.test/docs/<slug>.md\nFull reference (single document): https://example.test/llms-full.txt\n\n## Documentation\n\n'
    )
})
