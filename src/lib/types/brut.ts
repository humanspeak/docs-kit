/**
 * Shared types for the brutalist-mono v2 surfaces (`BrutIndexV2`, etc.).
 *
 * The v2 design lives across `/compare` and `/examples`-style index pages
 * (and any future sibling). Keep these props presentation-agnostic — they
 * describe the sheet layout, not what the consumer is listing.
 */

/** A row in the hero's meta sidebar. Either a key/value pair or a horizontal rule. */
export type BrutIndexMetaRow = { k: string; v: string; accent?: boolean } | { rule: 'dashed' }

/** A call-to-action button in the hero. */
export interface BrutIndexCta {
    label: string
    href: string
    /** Primary CTA gets the filled accent style; only one should be primary. */
    primary?: boolean
}

/** Hero block: meta sidebar, big monospace title, sub copy, CTA row. */
export interface BrutIndexHero {
    /** Top-right corner tag, e.g. "FIG-001 · EXAMPLES INDEX". */
    figLabel?: string
    /** Bottom-left corner tag, e.g. "FIG-001". */
    figId?: string
    /** Bottom-right corner tag, e.g. "SHEET 01 / 02". */
    sheetLabel?: string
    /** Sidebar rows. Insert `{ rule: 'dashed' }` between groups. */
    meta?: BrutIndexMetaRow[]
    /** Optional muted line at the bottom of the meta sidebar (e.g. "// scroll for matrices"). */
    metaFooter?: string
    /** Muted kicker line above the title (e.g. "// compare / svelte-markdown vs the field"). */
    kicker?: string
    /** Title parts. `accent` is the green word, `end` is the muted-gray punctuation. */
    title: { accent: string; end?: string }
    /** Sub copy. HTML allowed for `<b>` / `<code>` emphasis. */
    subHtml: string
    ctas?: BrutIndexCta[]
}

/** Section heading above the grid. */
export interface BrutIndexLede {
    kicker?: string
    title: { prefix?: string; accent: string; suffix?: string }
    body?: string
}

/** A single grid cell. */
export interface BrutIndexItem {
    href: string
    /** Pre-formatted ID label, e.g. "№ 01 / 12". */
    id: string
    /** Cell title. Already in display form (typically pre-lowercased with trailing period). */
    title: string
    /** Optional small uppercase tag (category). */
    tag?: string
    /** Optional one-line description. */
    line?: string
}

/** Right-column footer entry — either a plain text line or a link. */
export type BrutIndexFooterRightEntry = string | { label: string; href: string }

/** Big-type footer block. */
export interface BrutIndexFooter {
    /** Big-type CTA. Renders as `{prefix}<br/><span>{accent}</span> →` followed by an uppercase hint. */
    big: { prefix: string; accent: string; href: string; hint?: string }
    /** Left-column info lines. Defaults to set/copyright/license credits. */
    left?: string[]
    /** Right-column info lines (and optional home link). Defaults to sheet/end-of-index/home. */
    right?: BrutIndexFooterRightEntry[]
}
