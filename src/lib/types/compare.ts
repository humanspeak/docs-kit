/**
 * Shared types for the brutalist /compare surfaces (ComparisonPageV2 +
 * CompareIndexV2). Every Humanspeak docs site that ships head-to-heads
 * uses this shape — one `compare-data.ts` array of `Competitor` objects
 * drives both pages.
 */

export interface ComparisonFeature {
    /** Feature row label (e.g. "Streaming HTML Output", "Spring Physics"). */
    name: string
    /** Our value: `true` / `false` for yes / no, or any string for free-form copy. */
    us: string | boolean
    /** Their value: same shape. */
    them: string | boolean
    /** Optional small print rendered below the feature name. */
    note?: string
}

export interface Competitor {
    /** URL slug, used as the `/compare/<slug>` path. Free to include a `vs-`
     *  prefix or not — both work as long as the consumer is consistent. */
    slug: string
    /** Display name (e.g. "MDsveX", "Framer Motion"). Lowercased in the hero. */
    name: string
    /** One-line description shown in the hero subtitle + compare-index card. */
    tagline: string
    /** Longer paragraph for the "at a glance" overview panel. */
    description: string
    website?: string
    github?: string
    /** npm package name, e.g. `"mdsvex"`. Rendered as a link. */
    npm?: string
    /** Category, e.g. "Build-Time Preprocessor". Surfaced in the metadata strip. */
    type: string
    /** One-line approach summary, e.g. "Compile markdown to Svelte at build time". */
    approach: string
    /** Side-by-side feature matrix rows. */
    features: ComparisonFeature[]
    /** Bulleted strengths for us. */
    prosUs: string[]
    /** Bulleted strengths for them. */
    prosThem: string[]
    /** Bulleted limitations for us. */
    consUs: string[]
    /** Bulleted limitations for them. */
    consThem: string[]
    /** Honest verdict paragraph rendered in the highlighted panel. */
    verdict: string
    /** SEO keywords for the JSON-LD payload. */
    keywords: string[]
}

/**
 * Brand identity for the "us" side of every comparison. ComparisonPageV2
 * and CompareIndexV2 read these props to label the matrix's "us" column,
 * write the comparator path comment, build JSON-LD, etc.
 */
export interface ComparisonOurs {
    /** Display name e.g. "Svelte Motion", "Svelte Markdown". Lowercased in headings. */
    name: string
    /** npm package e.g. "@humanspeak/svelte-motion" — shown as the matrix "us" header. */
    npmPackage: string
    /** Short slug e.g. "svelte-motion" — used in the `// compare / <slug> vs ...` strip. */
    slug: string
    /** Canonical site URL e.g. "https://motion.svelte.page" — used in JSON-LD. */
    url: string
}

/**
 * Optional knobs for the footer CTA on either compare surface.
 * Defaults yield `try <ours.name> →` with "install in 30 seconds" hint.
 */
export interface CompareFooterCta {
    href?: string
    /** Big-type label split into a prefix + accent half. Defaults to
     *  `{ prefix: 'try ', accent: ours.name.toLowerCase() }`. */
    label?: { prefix: string; accent: string }
    hint?: string
}
