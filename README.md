# @humanspeak/docs-kit

Shared documentation infrastructure for Humanspeak Svelte libraries.

## Favicons and visible logos

`RootLayout.favicon` is the browser/search icon and defaults to `/favicon.png`.
Every site must ship its own branded, square PNG at `static/favicon.png` before
using this default. An explicit favicon URL still overrides it. `SeoHead` callers
should pass `favicon="/favicon.png"` themselves. Do not import the favicon through
Vite: small assets can become data URLs, and SVG is not among Google's supported
search favicon formats. Use a stable public PNG URL on the homepage and nested
routes, and allow Googlebot and Googlebot-Image to crawl it.

Visible header logos have a separate purpose. The existing `favicon` prop on
`Header`, `HeaderV2`, and the docs/blog/example/compare layouts is a **legacy name
for the visible logo**; it does not declare a search favicon. Continue passing
the SVG there to preserve crisp branding. Name that import `logo` in new sites:

```svelte
<script lang="ts">
    import { RootLayout, HeaderV2 } from '@humanspeak/docs-kit'
    import logo from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'

    const { children } = $props()
</script>

<RootLayout config={docsConfig} favicon="/favicon.png">
    <HeaderV2 config={docsConfig} favicon={logo} />
    {@render children()}
</RootLayout>
```

For a new site, select its actual brand mark first; never retain a copied Svelte
placeholder. Generate and commit a 192×192 PNG from that square SVG:

```js
import { generateFavicon } from '@humanspeak/docs-kit/scripts/favicon'
await generateFavicon('src/lib/assets/logo.svg')
```

After `vite build`, verify the rendered production HTML and served PNG using a
Vite preview. This checks the homepage even if only nested paths are supplied,
rejects duplicate, data, blob, relative, SVG, or hashed icon declarations, checks
HTTP status, MIME type and dimensions, and compares PNG bytes against the source
logo to catch stale or copied placeholder assets:

```js
import { checkFavicon } from '@humanspeak/docs-kit/scripts/favicon'
import { preview } from 'vite'

const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
try {
    await checkFavicon({
        origin: server.resolvedUrls.local[0],
        logo: 'src/lib/assets/logo.svg',
        paths: ['/', '/docs/getting-started']
    })
} finally {
    await server.close()
}
```

Use a real nested route for the site. Put this check after **both** normal and
deployment builds. For post-deploy verification, pass the public origin instead
of starting a preview. The byte comparison validates consistency, not the artistic
identity of the SVG: visually review the source mark during setup. Then request
homepage indexing in Search Console and record the request date. Google may take
days or weeks to process the favicon, and display is not guaranteed. See
[Google's favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search).

## Breadcrumb structured data

`BreadcrumbJsonLd` serializes the breadcrumb context into a `BreadcrumbList`,
prepending Home. Intermediate breadcrumbs without an href (including an empty
href) are UI-only grouping labels and are omitted from structured data. The final
breadcrumb represents the current page and is retained even without an href.
Positions are contiguous after filtering, and empty or absent context emits no
breadcrumb list.

For example, Docs (`/docs`) → Renderers (unlinked) → HTML (unlinked) produces
Home → Docs → HTML in JSON-LD. The original context is unchanged, so visible
navigation can still show Renderers. Linked breadcrumbs keep their existing URL
construction: the canonical `config.url` followed by the breadcrumb href. Supply
a base URL without a trailing slash and site-relative hrefs beginning with `/`.

Run `pnpm test` to build the package and run the Node tests, including SSR tests
that compile the actual breadcrumb component and render it with a context fixture.
