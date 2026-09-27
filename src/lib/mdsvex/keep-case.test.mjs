import assert from 'node:assert/strict'
import { test } from 'node:test'

const { rehypeKeepCase } = await import(
    new URL('../../../dist/mdsvex/index.js', import.meta.url).href
)

const h = (tagName, children, properties) => ({ type: 'element', tagName, properties, children })
const t = (value) => ({ type: 'text', value })

test('rehypeKeepCase tags identifier headings and leaves prose headings alone', () => {
    const tree = {
        type: 'root',
        children: [
            h('h1', [t('createColumns')]),
            h('h2', [t('Usage')]),
            h('h3', [h('code', [t('attrs: () => Readable<Attrs>')])], { className: ['existing'] }),
            h('p', [t('TableViewModel in a paragraph is not a heading')])
        ]
    }
    rehypeKeepCase()(tree)
    const [h1, h2, h3, p] = tree.children
    assert.deepEqual(h1.properties.className, ['dk-keep-case'])
    assert.equal(h2.properties, undefined)
    assert.deepEqual(h3.properties.className, ['existing', 'dk-keep-case'])
    assert.equal(p.properties, undefined)
})

test('rehypeKeepCase accepts a string className and does not duplicate the class', () => {
    const tree = {
        type: 'root',
        children: [h('h2', [t('addSortBy')], { className: 'x dk-keep-case' })]
    }
    rehypeKeepCase()(tree)
    assert.deepEqual(tree.children[0].properties.className, ['x', 'dk-keep-case'])
})
