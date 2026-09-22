# @humanspeak/docs-kit

Shared documentation infrastructure for Humanspeak Svelte libraries.

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
