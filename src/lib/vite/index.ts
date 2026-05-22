/**
 * `@humanspeak/docs-kit/vite` — Vite-plugin entry point.
 *
 * Plugins exported from here are meant to be added to a consumer's
 * `vite.config.ts` plugins array. They handle build-time and dev-time
 * concerns that can't be solved from inside Svelte components themselves
 * (filesystem scanning, manifest emission, etc.).
 */
export { demoManifestPlugin, type DemoManifestOptions } from './demo-manifest.js'
export { docMirrorsPlugin, type DocMirrorsOptions } from './doc-mirrors.js'
export { llmsFullPlugin, type LlmsFullOptions } from './llms-full.js'
export { llmsPlugin, type LlmsOptions } from './llms.js'
export { sitemapManifestPlugin, type SitemapManifestOptions } from './sitemap-manifest.js'
