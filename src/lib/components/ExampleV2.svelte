<!--
  @component
  Brutalist-mono example sheet (v2).

  Matches the streaming / playground sheet pattern from the brutalist
  homepage: a `220px lede + 1fr panel` two-column section. The lede
  carries the small-caps `FIG-XXX / CATEGORY` kicker, a big mono `<h2>`
  with an accent word, and a description paragraph; the panel is a
  hairline-bordered card with a file-path bar on top, the demo as body,
  and a key/value strip on the bottom. The demo dominates — chrome
  shrinks to thin strips so the actual interaction is the page.

  Sits inside `BrutLayoutV2` / `ExampleLayoutV2`; the parent provides the
  brutalist surface tokens (`--brut-bg`, `--brut-rule`, etc.) via
  `@humanspeak/docs-kit/styles/brutalist.css`.

  Wiring:

  ```svelte
  <ExampleV2
      figId="FIG-001"
      tag="DEMO"
      title={{ prefix: 'live ', accent: 'playground', end: '.' }}
      description="Edit markdown on the left, see it rendered on the right."
      sourceUrl="https://github.com/.../Playground.svelte"
      filename="MarkdownPlayground.svelte"
  >
      <Playground />
  </ExampleV2>
  ```
-->
<script lang="ts">
    import { MotionA, MotionButton, MotionDiv } from '@humanspeak/svelte-motion'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import RotateCw from '@lucide/svelte/icons/rotate-cw'
    import type { Snippet } from 'svelte'

    interface TitleShape {
        /** Text before the accent span. Defaults to empty. */
        prefix?: string
        /** The accent-coloured word (rendered teal). */
        accent: string
        /** Text after the accent span. Defaults to `.` to match the
         *  brutalist headline style ("live playground."). */
        end?: string
    }

    interface FooterMeta {
        k: string
        v: string
        accent?: boolean
    }

    interface BarCell {
        /** Label rendered in muted ink (e.g. `file`, `policy`, `theme`). */
        k: string
        /** Value rendered in normal ink (e.g. `playground.svelte`, `allow-all`). */
        v: string
    }

    interface Props {
        /** Demo content — the page's reason to exist. Sits in the panel
         *  body and takes whatever vertical space the demo claims. */
        children: Snippet
        /** Headline split into a plain prefix + accent span + plain end.
         *  Mirrors the brutalist `<h2>brut <span>section</span>.</h2>`
         *  shape used across the homepage and `/compare`. Can also be
         *  passed as a plain string — it'll be rendered as the accent. */
        title: TitleShape | string
        /** Lede paragraph under the headline. Plain text only. */
        description?: string
        /** Category pill rendered in the top kicker (e.g. `RENDERERS`,
         *  `SECURITY`). Echoes the tag shown on the index card so a
         *  viewer arriving deep-linked still sees the bucket. */
        tag?: string
        /** FIG identifier rendered in front of the tag in the kicker
         *  (e.g. `FIG-001`). Defaults to `FIG-001`. */
        figId?: string
        /** Sheet label rendered in the panel's footer strip (e.g.
         *  `SHEET 01 / 01`). */
        sheetLabel?: string
        /** GitHub (or other) URL pointing at the demo's source file.
         *  Surfaces as `↗ source` in the panel bar. */
        sourceUrl?: string | null
        /** Filename to render as `file · <name>` in the panel's top bar.
         *  Auto-derived from `sourceUrl`'s final path segment when omitted.
         *  Ignored when `barCells` is provided — the consumer is opting out
         *  of the automatic file label entirely. */
        filename?: string
        /** Custom left-side cells for the panel bar. When provided, replaces
         *  the auto `file · <name>` cell entirely. Use this when several
         *  sheets share an underlying component file and the filename is
         *  no longer the right axis to label them by (e.g. each sheet is
         *  one `policy · allow-all` of the same renderer). */
        barCells?: BarCell[]
        /** Extra metadata rows for the panel's footer strip — appended
         *  after the auto-derived `category` + `sheet` entries. */
        footerMeta?: FooterMeta[]
        /** Back-link label in the lede column. Default `↩ all examples`. */
        backLabel?: string
        /** Back-link href. Default `/examples`. */
        backHref?: string
        /** Panel mode. `'live'` (default) shows the running dot in the bar and
         *  a reset button; `'static'` is for non-interactive content like code
         *  references — it hides the dot, swaps the bar status to
         *  `mode · static`, and omits the reset button. Pass a string for a
         *  custom mode label (rendered as `mode · <value>`). */
        mode?: 'live' | 'static' | (string & {})
        /** Optional code panel describing how the demo was built. When
         *  provided, the bar shows a `[ </> code ]` toggle that reveals this
         *  snippet inside the panel, below the demo body. Render whatever
         *  shape you want here — a `CodeReferenceV2` with a single sample is
         *  the typical choice. */
        codeSnippet?: Snippet
        /** Label for the code-toggle button. Default `code`. Use this to be
         *  more specific (`view source`, `wire-up`, etc.). */
        codeLabel?: string
        /** Optional supplementary content for the lede column — renders
         *  after the description and before the back-link. Useful for
         *  educational bullets, deep-dive links, or context that belongs
         *  with the lede vocabulary but doesn't fit one tight paragraph.
         *  The right-hand panel stays focused on the interactive demo. */
        notes?: Snippet
    }

    const {
        children,
        title,
        description,
        tag,
        figId = 'FIG-001',
        sheetLabel = 'SHEET 01 / 01',
        sourceUrl,
        filename,
        barCells,
        footerMeta = [],
        backLabel = '↩ all examples',
        backHref = '/examples',
        mode = 'live',
        codeSnippet,
        codeLabel = 'code',
        notes
    }: Props = $props()

    let codeOpen = $state(false)
    const toggleCode = () => {
        codeOpen = !codeOpen
    }

    // Motion animates from numeric value to numeric value cleanly, but
    // `height: 'auto' → 0` snaps because Motion can't interpolate the
    // string `'auto'`. We `bind:offsetHeight` the inner panel so we always
    // know its natural rendered height and feed that as a concrete number
    // into the wrapper's `animate` prop — Motion smoothly transitions both
    // directions, and the value stays reactive if the content grows
    // (e.g. shiki highlighter finishes mid-frame and the code reflows).
    let codeContentHeight = $state(0)

    // `live` is the only mode that gets the animated dot + reset button —
    // anything else (`static`, custom strings) reads as steady-state content
    // so we drop the affordances that would lie about the sheet's behaviour.
    const isLive = $derived(mode === 'live')

    // Normalize `title` so consumers can pass either a string or the
    // split-shape object. The plain-string form becomes the accent span
    // with a trailing period — same default the homepage uses.
    const titleShape = $derived.by<TitleShape>(() =>
        typeof title === 'string' ? { accent: title, end: '.' } : { end: '.', ...title }
    )

    // Derive the file name from the source URL when the consumer
    // didn't pass one explicitly. Keeps the panel bar honest without
    // forcing every call site to spell out a filename it already
    // implicitly identifies via the URL.
    const derivedFilename = $derived.by(() => {
        if (filename) return filename
        if (!sourceUrl) return ''
        try {
            const path = new URL(sourceUrl).pathname
            return path.split('/').filter(Boolean).pop() ?? ''
        } catch {
            return ''
        }
    })

    // a11y / SR title — the visible h2 in the lede already carries the
    // accessible name, so no second hidden heading is needed.
    const a11yTitle = $derived(
        [titleShape.prefix, titleShape.accent, titleShape.end].filter(Boolean).join('').trim()
    )

    let refreshId = $state(0)
    const refresh = () => {
        refreshId++
    }

    const tapScale = { scale: 0.96 }
    const hoverScale = { scale: 1.02 }
</script>

<section class="dk-ex" aria-label={a11yTitle}>
    <!-- Lede column — kicker / h2 / description / back-link. Mirrors
         the `.lede` blocks on the homepage so the page stitches into
         the same sheet vocabulary as the index and /compare. -->
    <div class="dk-ex-lede">
        <div class="dk-ex-kicker">{figId}{#if tag}<span> / {tag}</span>{/if}</div>
        <h2 class="dk-ex-title">
            {#if titleShape.prefix}{titleShape.prefix}{/if}<span>{titleShape.accent}</span
            >{#if titleShape.end}<span class="end">{titleShape.end}</span>{/if}
        </h2>
        {#if description}
            <p class="dk-ex-desc">{description}</p>
        {/if}
        {#if notes}
            <div class="dk-ex-notes">
                {@render notes()}
            </div>
        {/if}
        <MotionA
            href={backHref}
            whileTap={tapScale}
            whileHover={hoverScale}
            class="dk-ex-back"
            aria-label="All examples"
        >
            {backLabel}
        </MotionA>
    </div>

    <!-- Demo panel — bordered card with file-path bar on top, the
         actual demo as body, and a key/value strip on the bottom. -->
    <div class="dk-ex-panel">
        <div class="dk-ex-bar">
            {#if barCells && barCells.length}
                {#each barCells as cell, i (i)}
                    <span class="dk-ex-bar-cell">
                        <span class="lbl">{cell.k}</span> ·
                        <span class="v">{cell.v}</span>
                    </span>
                {/each}
            {:else if derivedFilename}
                <span class="dk-ex-bar-cell">
                    <span class="lbl">file</span> ·
                    <span class="v">{derivedFilename}</span>
                </span>
            {/if}
            <span class="dk-ex-bar-cell">
                <span class="lbl">mode</span> ·
                <span class="v">{mode}</span>
            </span>
            {#if isLive}
                <span class="dk-ex-bar-cell live">
                    <span class="dot"></span>
                    <span class="v">running</span>
                </span>
            {/if}
            <span class="dk-ex-bar-grow"></span>
            {#if codeSnippet}
                <MotionButton
                    type="button"
                    onclick={toggleCode}
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class={codeOpen ? 'dk-ex-ctrl active' : 'dk-ex-ctrl'}
                    aria-pressed={codeOpen}
                    aria-label={codeOpen ? `Hide ${codeLabel}` : `Show ${codeLabel}`}
                >
                    <span class="dk-ex-glyph" aria-hidden="true">{'</>'}</span>
                    <span>{codeOpen ? `hide ${codeLabel}` : codeLabel}</span>
                </MotionButton>
            {/if}
            {#if sourceUrl}
                <MotionA
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="dk-ex-ctrl"
                >
                    <ExternalLink size={11} />
                    <span>source</span>
                </MotionA>
            {/if}
            {#if isLive}
                <MotionButton
                    type="button"
                    onclick={refresh}
                    whileTap={tapScale}
                    whileHover={hoverScale}
                    class="dk-ex-ctrl"
                    aria-label="Reset demo"
                    title="Reset example"
                >
                    <RotateCw size={11} />
                    <span>reset</span>
                </MotionButton>
            {/if}
        </div>

        <div class="dk-ex-body">
            {#key refreshId}
                {@render children()}
            {/key}
        </div>

        {#if codeSnippet}
            <!-- Reveal the consumer-supplied code snippet inside the panel
                 between the demo body and the foot strip. The outer
                 `MotionDiv` stays mounted at all times and animates between
                 a collapsed (height: 0, opacity: 0) and expanded (auto
                 height, full opacity) state when `codeOpen` flips —
                 `AnimatePresence` doesn't work here because Svelte's
                 `{#if}` unmounts the branch synchronously and the exit
                 animation never gets a chance to run.

                 The inner `.dk-ex-code-panel` carries the actual border /
                 background; the outer wrapper is invisible chrome that
                 owns the height transition. With `overflow: hidden` set
                 inline, the inner border is fully clipped when collapsed
                 so the foot strip sits flush against the body. -->
            <MotionDiv
                class="dk-ex-code-shell"
                initial={false}
                animate={codeOpen
                    ? { opacity: 1, height: codeContentHeight }
                    : { opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                style="overflow: hidden;"
                aria-hidden={!codeOpen}
            >
                <div class="dk-ex-code-panel" bind:offsetHeight={codeContentHeight}>
                    <div class="dk-ex-code-panel-head">
                        <span class="lbl">{codeLabel}</span> ·
                        <span class="v">used to build this demo</span>
                    </div>
                    {@render codeSnippet()}
                </div>
            </MotionDiv>
        {/if}

        <div class="dk-ex-foot">
            {#if tag}
                <div class="dk-ex-foot-cell">
                    <span class="lbl">category</span> ·
                    <span class="v accent">{tag.toLowerCase()}</span>
                </div>
            {/if}
            <div class="dk-ex-foot-cell">
                <span class="lbl">sheet</span> ·
                <span class="v">{sheetLabel.toLowerCase()}</span>
            </div>
            {#each footerMeta as m, i (i)}
                <div class="dk-ex-foot-cell">
                    <span class="lbl">{m.k}</span> ·
                    <span class="v" class:accent={m.accent}>{m.v}</span>
                </div>
            {/each}
            <div class="dk-ex-foot-cell right">
                <span class="lbl">{isLive ? '⟳ to re-run' : 'static · copy paste'}</span>
            </div>
        </div>
    </div>
</section>

<style>
    /* ── Section frame — 220px lede + 1fr panel, hairline below ─── */
    .dk-ex {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }

    /* ── Lede column ─────────────────────────────────────────────── */
    .dk-ex-lede {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
    }
    .dk-ex-kicker {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }
    .dk-ex-kicker span {
        color: var(--brut-accent);
    }
    .dk-ex-title {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
        line-height: 1.1;
    }
    .dk-ex-title span {
        color: var(--brut-accent);
    }
    .dk-ex-title .end {
        color: var(--brut-ink-3);
    }
    .dk-ex-desc {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 240px;
    }
    /* Slot for supplementary lede content (bullet lists, deep-dive links,
       icons + captions). Width-capped to match the description so the
       lede column stays a coherent narrow rail and doesn't compete with
       the right-hand demo panel for visual weight. */
    .dk-ex-notes {
        margin-top: 16px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        font-size: 12.5px;
        line-height: 1.55;
        max-width: 240px;
    }
    .dk-ex-notes :global(ul) {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .dk-ex-notes :global(li) {
        display: flex;
        gap: 8px;
        align-items: flex-start;
    }
    /* Lucide icons inside notes pick up the brut accent and align with
       the first line of text. Consumers can override by scoping their
       own classes. */
    .dk-ex-notes :global(svg) {
        flex-shrink: 0;
        margin-top: 3px;
        color: var(--brut-accent);
        width: 12px;
        height: 12px;
    }
    /* Inline code chips inside notes. The notes column isn't prose, so
       consumers can drop `<code>` into a `<span>` without buying a full
       markdown renderer — we style it to match the rest of the brut
       chrome (bg-2 fill, thin rule, mono). */
    .dk-ex-notes :global(code) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-size: 11.5px;
        color: var(--brut-ink);
        border-radius: 2px;
    }
    .dk-ex :global(.dk-ex-back) {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 11.5px;
        letter-spacing: 0.08em;
        text-transform: lowercase;
    }
    .dk-ex :global(.dk-ex-back:hover) {
        text-decoration: underline;
    }

    /* ── Panel ───────────────────────────────────────────────────── */
    .dk-ex-panel {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    /* Top bar — file path + status + actions. */
    .dk-ex-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
        background: var(--brut-bg-2);
        flex-wrap: wrap;
    }
    .dk-ex-bar-cell {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .dk-ex-bar-cell .lbl {
        color: var(--brut-ink-3);
    }
    .dk-ex-bar-cell .v {
        color: var(--brut-ink);
    }
    .dk-ex-bar-cell.live {
        color: var(--brut-accent);
    }
    .dk-ex-bar-cell.live .v {
        color: var(--brut-accent);
    }
    .dk-ex-bar-cell.live .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--brut-accent);
        box-shadow: 0 0 0 0 var(--brut-accent);
        animation: dk-ex-pulse 1.6s ease-out infinite;
        flex-shrink: 0;
    }
    @keyframes dk-ex-pulse {
        0% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--brut-accent) 60%, transparent);
        }
        80%,
        100% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--brut-accent) 0%, transparent);
        }
    }
    .dk-ex-bar-grow {
        flex: 1;
    }
    .dk-ex :global(.dk-ex-ctrl) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: inherit;
        font-size: 11px;
        text-decoration: none;
        cursor: pointer;
        text-transform: lowercase;
        transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s;
    }
    .dk-ex :global(.dk-ex-ctrl:hover) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    /* Active-state for toggle controls — used by the code reveal button so
       the bar persistently shows whether the code panel is open. */
    .dk-ex :global(.dk-ex-ctrl.active) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
        background: var(--brut-accent-soft, color-mix(in srgb, var(--brut-accent) 10%, transparent));
    }
    .dk-ex :global(.dk-ex-glyph) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0;
    }

    /* ── Code panel — toggle-revealed under the body ─────────────── */
    .dk-ex-code-panel {
        border-top: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        display: flex;
        flex-direction: column;
    }
    .dk-ex-code-panel-head {
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .dk-ex-code-panel-head .lbl {
        color: var(--brut-ink-3);
    }
    .dk-ex-code-panel-head .v {
        color: var(--brut-ink-2);
    }

    /* ── Body — the demo ─────────────────────────────────────────── */
    /* `flex: 1 1 auto` claims the leftover height inside the panel so
       the foot anchors at the bottom of the row instead of riding up
       under a short demo. Demos with tall natural content are
       unaffected — basis `auto` respects content size as the lower
       bound. */
    .dk-ex-body {
        position: relative;
        min-height: 0;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
    }
    /* Demos almost always sit inside their own `mx-auto max-w-X` wrapper,
       so the body just lets them claim the width they want. The flex
       column lets demos that opt into `flex: 1` (like a tall editor)
       fill the panel naturally. */
    :global(.dk-ex-body > *) {
        flex: 1 1 auto;
        min-width: 0;
    }

    /* ── Foot — key/value strip ──────────────────────────────────── */
    .dk-ex-foot {
        display: flex;
        align-items: stretch;
        border-top: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
        background: var(--brut-bg);
        flex-wrap: wrap;
    }
    .dk-ex-foot-cell {
        padding: 8px 14px;
        border-right: 1px solid var(--brut-rule);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .dk-ex-foot-cell:last-child {
        border-right: 0;
    }
    .dk-ex-foot-cell.right {
        margin-left: auto;
        color: var(--brut-ink-3);
    }
    .dk-ex-foot-cell .lbl {
        color: var(--brut-ink-3);
    }
    .dk-ex-foot-cell .v {
        color: var(--brut-ink);
    }
    .dk-ex-foot-cell .v.accent {
        color: var(--brut-accent);
        text-transform: uppercase;
        letter-spacing: 0.12em;
    }

    /* ── Responsive collapse ─────────────────────────────────────── */
    @media (max-width: 1024px) {
        .dk-ex {
            grid-template-columns: 1fr;
        }
        .dk-ex-desc {
            max-width: 720px;
        }
    }
    @media (max-width: 720px) {
        .dk-ex {
            padding-left: 16px;
            padding-right: 16px;
        }
        .dk-ex-bar,
        .dk-ex-foot {
            padding-left: 12px;
            padding-right: 12px;
        }
    }
</style>
