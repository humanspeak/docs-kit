/**
 * Vite plugin: docs-kit social-card generator.
 *
 * Wraps the underlying `generateSocialCards()` script so consumers can drop
 * it into their `vite.config.ts` instead of running a separate
 * `tsx scripts/generate-social-cards.ts` step before `vite build`. Matches
 * the pattern of the other `@humanspeak/docs-kit/vite` plugins
 * (`llmsPlugin`, `demoManifestPlugin`, etc.) — wiring lives in one place,
 * options are typed, and `configResolved` adopts Vite's project root.
 *
 * Emits `static/og-default.png`, `static/twitter-default.png`, and one
 * `og-<slug>.png` + `twitter-<slug>.png` pair per discoverable page into
 * `static/social-cards/`. Discovery rules (see `generateSocialCards`):
 *
 *   1. Static regex scan of `src/routes/**\/+page.{svelte,svx}` for a
 *      literal `seo.ogSlug = '...'` assignment.
 *   2. Optional `blogContentDir` — frontmatter scan of `*.md` files.
 *   3. `extraPages` — explicit list for routes whose ogSlug is built at
 *      runtime from props (e.g. `ComparisonPageV2`, where the slug is
 *      `compare-${competitor.slug}` — invisible to the regex).
 *
 * Build-only by design. Cards take seconds to render and emit ~MB of
 * PNGs; regenerating on every dev save would dominate HMR. `apply: 'build'`
 * scopes the work to `vite build` only — `pnpm dev` skips it (just like
 * the standalone-script setup did). Run `vite build` (or the manual
 * `generateSocialCards` script) to refresh while iterating on card design.
 *
 * Wiring (consumer's `vite.config.ts`):
 *
 * ```ts
 * import { socialCardsPlugin } from '@humanspeak/docs-kit/vite'
 * import { competitors } from './src/lib/compare-data'
 * import { docsConfig } from './src/lib/docs-config'
 *
 * export default defineConfig({
 *     plugins: [
 *         socialCardsPlugin({
 *             npmPackage: docsConfig.npmPackage,
 *             defaultTitle: docsConfig.name,
 *             defaultDescription: 'One-line pitch for the default card.',
 *             defaultFeatures: docsConfig.defaultFeatures,
 *             extraPages: competitors.map((c) => ({
 *                 ogSlug: `compare-${c.slug}`,
 *                 ogTitle: `vs ${c.name}`,
 *                 ogTagline: c.tagline,
 *                 ogFeatures: ['Feature Comparison', 'Pros & Cons', 'Migration Guide', 'Honest Verdict']
 *             }))
 *         })
 *     ]
 * })
 * ```
 */
import type { Plugin } from 'vite'

import { generateSocialCards, type PageSeoData } from '../scripts/generate-social-cards.js'

export type { PageSeoData }

export interface SocialCardsOptions {
    /** npm package name, e.g. `'@humanspeak/svelte-markdown'`. Required. */
    npmPackage: string
    /** Title rendered on `og-default.png` / `twitter-default.png`. Required. */
    defaultTitle: string
    /** Description rendered on the default cards. Required. */
    defaultDescription: string
    /** Feature pills rendered on the default cards. Required. */
    defaultFeatures: string[]
    /**
     * Root directory of the docs project (where `src/` and `static/`
     * live). When omitted, the plugin adopts Vite's resolved project
     * root via `configResolved` — match the convention of the sibling
     * plugins and leave this unset in normal use.
     */
    rootDir?: string
    /**
     * Optional path (relative to `rootDir`) to a blog content directory,
     * e.g. `'src/content/blog'`. When present, the generator scans `*.md`
     * frontmatter and emits one card per post.
     */
    blogContentDir?: string
    /**
     * Pages whose `ogSlug` is constructed at runtime from props and can't
     * be picked up by the static regex scan. See `PageSeoData`.
     */
    extraPages?: PageSeoData[]
}

/** Factory for the Vite plugin. */
export function socialCardsPlugin(userOptions: SocialCardsOptions): Plugin {
    if (!userOptions.npmPackage)
        throw new Error('[docs-kit:social-cards] `npmPackage` option is required')
    if (!userOptions.defaultTitle)
        throw new Error('[docs-kit:social-cards] `defaultTitle` option is required')
    if (!userOptions.defaultDescription)
        throw new Error('[docs-kit:social-cards] `defaultDescription` option is required')
    if (!Array.isArray(userOptions.defaultFeatures))
        throw new Error('[docs-kit:social-cards] `defaultFeatures` option is required')

    let rootDir = userOptions.rootDir ?? process.cwd()

    return {
        name: 'docs-kit:social-cards',
        apply: 'build',
        configResolved(config) {
            // Only adopt Vite's root when the consumer didn't pin one.
            if (userOptions.rootDir === undefined) rootDir = config.root
        },
        async buildStart() {
            await generateSocialCards({
                npmPackage: userOptions.npmPackage,
                defaultTitle: userOptions.defaultTitle,
                defaultDescription: userOptions.defaultDescription,
                defaultFeatures: userOptions.defaultFeatures,
                rootDir,
                blogContentDir: userOptions.blogContentDir,
                extraPages: userOptions.extraPages
            })
        }
    }
}
