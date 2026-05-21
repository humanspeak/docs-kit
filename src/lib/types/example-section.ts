/**
 * Shared types + helpers for ExampleV2-driven pages.
 *
 * Most `+page.svelte` files that render one or more `<ExampleV2>` rows end
 * up redeclaring the same `Section` shape and the same `pad2` sheet-label
 * helper. These exports remove the boilerplate — import them once and
 * drive the page off a `sections: ExampleSection[]` array.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import {
 *     ExampleV2,
 *     formatSheetLabel,
 *     type ExampleSection,
 *     type DemoManifestEntry
 *   } from '@humanspeak/docs-kit'
 *   import manifestJson from '$lib/demo-manifest.json'
 *
 *   const manifest = manifestJson as Record<string, DemoManifestEntry>
 *   const sections: ExampleSection[] = [{ figId: 'FIG-001', title: { accent: 'demo' }, ... }]
 * </script>
 *
 * {#each sections as section, i (section.figId)}
 *   <ExampleV2
 *     {...section}
 *     sheetLabel={formatSheetLabel(i, sections.length)}
 *   />
 * {/each}
 * ```
 */

import type { Snippet } from 'svelte'

/**
 * One `<ExampleV2>` row's data — every prop the consumer typically supplies,
 * collected as plain data so a page can drive multiple rows from an array.
 *
 * The shape mirrors `ExampleV2`'s own props 1:1; consumers who want extra
 * fields (e.g. analytics tags) can extend this interface.
 */
export interface ExampleSection {
    /** Top-left figure label, e.g. "FIG-001". */
    figId: string
    /** Optional category chip rendered next to the figId. */
    tag?: string
    /** Section title parts. `accent` is the highlighted word(s). */
    title: { prefix?: string; accent: string; end?: string }
    /** Body copy in the lede column. */
    description?: string
    /** Snippet that renders the live demo (or static figure). */
    snippet: Snippet
    /** Snippet for the collapsible code drawer (typically a `<CodeReferenceV2>`). */
    codeSnippet?: Snippet
    /** Snippet for the lede's note list (typically a `<ul>` with icons). */
    notes?: Snippet
    /** `'live'` shows a green "running" indicator; `'static'` shows nothing. */
    mode?: 'live' | 'static'
    /** Key/value chips rendered in the panel bar (e.g. `[{ k: 'pattern', v: 'flip' }]`). */
    barCells?: { k: string; v: string }[]
    /** GitHub URL for the demo source. Renders a "source" button in the bar. */
    sourceUrl?: string
}

/**
 * Shape of one entry in the `demo-manifest.json` emitted by
 * `demoManifestPlugin`. Cast the imported JSON to
 * `Record<string, DemoManifestEntry>` to get autocomplete.
 */
export interface DemoManifestEntry {
    /** Raw source after wrapper/comment strips, before Shiki. */
    code: string
    /** Detected language token (e.g. `'svelte'`). */
    lang: string
    /** Pre-rendered Shiki HTML for both light and dark themes. */
    html?: { light: string; dark: string }
}

/**
 * Format an index + total into the brutalist sheet label, e.g.
 * `formatSheetLabel(0, 12) === "SHEET 01 / 12"`. Pure presentation — drop in
 * a custom formatter if your design needs a different cadence.
 */
export const formatSheetLabel = (index: number, total: number): string =>
    `SHEET ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
