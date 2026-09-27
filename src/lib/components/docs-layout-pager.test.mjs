import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { compile } from 'svelte/compiler'

test('DocsLayoutV2 renders an optional pager snippet in the content column, above the footer, on brut-tokens', async () => {
    const source = await readFile(new URL('./DocsLayoutV2.svelte', import.meta.url), 'utf8')
    const { code } = compile(source, { filename: 'DocsLayoutV2.svelte', generate: 'server' }).js
    assert.match(source, /pager\?: Snippet/)
    assert.ok(code.includes('brut-tokens'), 'pager host uses the tokens-only class')
    const mainStart = source.indexOf('<main')
    const pagerAt = source.indexOf('{@render pager()}')
    const mainEnd = source.indexOf('</main>')
    const footerAt = source.indexOf('<FooterV2')
    assert.ok(
        mainStart < pagerAt && pagerAt < mainEnd && mainEnd < footerAt,
        'pager is inside main and above the footer'
    )
})

test('brutalist.css exposes .brut-tokens without a background, in light and dark', async () => {
    const css = await readFile(new URL('../styles/brutalist.css', import.meta.url), 'utf8')
    assert.match(css, /\.brut-wrap,\n\.brut,\n\.brut-tokens \{/)
    assert.match(css, /html\.dark \.brut-wrap,\nhtml\.dark \.brut,\nhtml\.dark \.brut-tokens \{/)
    assert.doesNotMatch(css, /\.brut-tokens \{\s*background/)
})
