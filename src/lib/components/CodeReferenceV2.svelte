<!--
  @component
  Brutalist-mono code-reference grid (v2).

  Drops into the body of an `ExampleV2` (or anywhere inside a `.brut-wrap`)
  and renders a horizontal grid of code samples — one cell per snippet,
  each with a single header strip carrying `tag · label` on the left and a
  copy-to-clipboard button on the right. Highlighting is consumer-supplied:
  pass each sample's pre-rendered shiki `html` for coloured output; omit it
  and the cell falls back to a plain `<pre><code>` block that still has the
  copy button.

  Designed for sheet sections like:

      FIG-002 / CODE   ·   code reference.

      [ allow-all  Allow All HTML        copy ]
       <code…>
      [ allow-safe Allow Only Safe       copy ]
       <code…>
      [ block-all  Block All HTML        copy ]
       <code…>

  Wiring:

  ```svelte
  <ExampleV2 mode="static" tag="CODE" title={{ accent: 'reference' }}>
    <CodeReferenceV2 samples={[
      { id: 'allow-all', label: 'Allow All HTML', code: '...', lang: 'svelte' },
      { id: 'allow-safe', label: 'Allow Only Safe', code: '...', lang: 'svelte', html: { light, dark } }
    ]} />
  </ExampleV2>
  ```
-->
<script lang="ts">
    import { AnimatePresence, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import CheckIcon from '@lucide/svelte/icons/check'
    import CopyIcon from '@lucide/svelte/icons/copy'
    import { onDestroy, onMount } from 'svelte'

    interface CodeSamplePayload {
        /** The raw code text. Used for the copy button and as the plain-text
         *  fallback when `html` is not provided. */
        code: string
        /** Optional language hint. Unused visually now that the lang label
         *  was dropped, but kept on the type so shiki-rendered samples can
         *  carry it for future per-cell decisions. */
        lang?: string
        /** Pre-rendered shiki HTML for light + dark themes. When omitted, the
         *  cell renders a plain `<pre><code>` block. */
        html?: { light: string; dark: string }
    }

    interface EagerCodeSample extends CodeSamplePayload {
        /** Stable identifier — surfaces as the small-caps tag on the left of
         *  the header strip. */
        id: string
        /** Display title rendered as the header's `<h3>`. */
        label: string
    }

    interface LazyCodeSample {
        /** Stable identifier — surfaces as the small-caps tag on the left of
         *  the header strip. */
        id: string
        /** Display title rendered as the header's `<h3>`. */
        label: string
        /** Load the raw/highlighted code on demand. Supports both a plain
         *  payload and an ESM module default export so consumers can pass
         *  `() => import('virtual:docs-kit/demo/...')` directly. */
        load: () => Promise<CodeSamplePayload | { default: CodeSamplePayload }>
        /** Override component-level lazy preloading for this sample. */
        preload?: 'idle' | false
    }

    type CodeSample = EagerCodeSample | LazyCodeSample
    type IdleRuntime = typeof globalThis & {
        requestIdleCallback?: (callback: () => void) => number
        cancelIdleCallback?: (id: number) => void
    }

    function isLazySample(sample: CodeSample): sample is LazyCodeSample {
        return 'load' in sample
    }

    interface Props {
        samples: CodeSample[]
        /** Columns at desktop width. Default `auto`, which uses the number of
         *  samples up to 3 (so 1 sample = 1 col, 4 samples = still 3 cols
         *  wrapping). Pass an integer to force a specific column count. */
        columns?: number | 'auto'
        /** Lazy sample preload strategy. `idle` fetches after hydration so
         *  code drawers are warm without blocking the initial page. Eager
         *  samples are unaffected. */
        preload?: 'idle' | false
    }

    const { samples, columns = 'auto', preload = 'idle' }: Props = $props()

    const colCount = $derived(
        columns === 'auto' ? Math.min(samples.length, 3) : Math.max(1, columns)
    )

    // Track which cell most recently requested a copy so we can swap the icon
    // to a check and reset after 1.6s. Keyed by sample id so multiple cells can
    // show "copied" independently if the user clicks through them quickly.
    let copiedId = $state<string | null>(null)
    let copyResetTimer: ReturnType<typeof setTimeout> | null = null
    let loadedById = $state<Record<string, CodeSamplePayload>>({})
    let loadingById = $state<Record<string, boolean>>({})
    let errorById = $state<Record<string, boolean>>({})
    const pendingById = new Map<string, Promise<CodeSamplePayload | null>>()
    const cancelPreloads: Array<() => void> = []

    const showCopyFeedback = (sampleId: string) => {
        copiedId = sampleId
        if (copyResetTimer) clearTimeout(copyResetTimer)
        copyResetTimer = setTimeout(() => {
            copiedId = null
            copyResetTimer = null
        }, 1600)
    }

    const getPayload = (sample: CodeSample): CodeSamplePayload | null => {
        if (!isLazySample(sample)) return sample
        return loadedById[sample.id] ?? null
    }

    const unwrapPayload = (
        payload: CodeSamplePayload | { default: CodeSamplePayload }
    ): CodeSamplePayload => ('default' in payload ? payload.default : payload)

    const loadSample = async (sample: CodeSample): Promise<CodeSamplePayload | null> => {
        if (!isLazySample(sample)) return sample

        const cached = loadedById[sample.id]
        if (cached) return cached

        const pending = pendingById.get(sample.id)
        if (pending) return pending

        loadingById = { ...loadingById, [sample.id]: true }
        errorById = { ...errorById, [sample.id]: false }

        const next = sample
            .load()
            .then((payload) => {
                const loaded = unwrapPayload(payload)
                loadedById = { ...loadedById, [sample.id]: loaded }
                return loaded
            })
            .catch(() => {
                errorById = { ...errorById, [sample.id]: true }
                return null
            })
            .finally(() => {
                loadingById = { ...loadingById, [sample.id]: false }
                pendingById.delete(sample.id)
            })

        pendingById.set(sample.id, next)
        return next
    }

    const scheduleIdlePreload = (sample: LazyCodeSample) => {
        const runtime = globalThis as IdleRuntime

        const run = () => {
            void loadSample(sample)
        }

        if (runtime.requestIdleCallback && runtime.cancelIdleCallback) {
            const id = runtime.requestIdleCallback(run)
            cancelPreloads.push(() => runtime.cancelIdleCallback?.(id))
            return
        }

        const id = globalThis.setTimeout(run, 250)
        cancelPreloads.push(() => globalThis.clearTimeout(id))
    }

    const copy = async (sample: CodeSample) => {
        const payload = await loadSample(sample)
        if (!payload) return

        showCopyFeedback(sample.id)
        if (typeof navigator === 'undefined' || !navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(payload.code)
        } catch {
            /* clipboard blocked — fail quiet, the user can select + copy */
        }
    }

    onMount(() => {
        for (const sample of samples) {
            if (!isLazySample(sample)) continue
            const samplePreload = sample.preload ?? preload
            if (samplePreload === 'idle') scheduleIdlePreload(sample)
        }
    })

    onDestroy(() => {
        if (copyResetTimer) clearTimeout(copyResetTimer)
        for (const cancel of cancelPreloads) cancel()
    })

    const copyPress = { scale: 0.96 }
    const copyHover = { scale: 1.03 }
    const copyStateTransition = { duration: 0.16 }
</script>

<div class="dk-coderef" style="--dk-coderef-cols: {colCount}">
    {#each samples as sample (sample.id)}
        {@const payload = getPayload(sample)}
        {@const isLoading = Boolean(loadingById[sample.id])}
        {@const hasError = Boolean(errorById[sample.id])}
        <article class="dk-coderef-cell">
            <header class="dk-coderef-head">
                <div class="dk-coderef-meta">
                    <span class="dk-coderef-tag">{sample.id}</span>
                    <h3>{sample.label}</h3>
                </div>
                <MotionButton
                    type="button"
                    class={copiedId === sample.id ? 'dk-coderef-copy copied' : 'dk-coderef-copy'}
                    aria-label="Copy {sample.label} snippet"
                    onclick={() => copy(sample)}
                    whileTap={copyPress}
                    whileHover={copyHover}
                    disabled={isLoading}
                    aria-busy={isLoading}
                >
                    <AnimatePresence initial={false}>
                        {#if copiedId === sample.id}
                            <MotionSpan
                                key="copied"
                                class="dk-coderef-copy-state copied-state"
                                initial={{ opacity: 1, y: 0 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 0 }}
                                transition={copyStateTransition}
                            >
                                <CheckIcon size={11} />
                                <span>copied</span>
                            </MotionSpan>
                        {:else if isLoading}
                            <MotionSpan
                                key="loading"
                                class="dk-coderef-copy-state loading-state"
                                initial={{ opacity: 1, y: 0 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 0 }}
                                transition={copyStateTransition}
                            >
                                <span>loading</span>
                            </MotionSpan>
                        {:else}
                            <MotionSpan
                                key="copy"
                                class="dk-coderef-copy-state copy-state"
                                initial={{ opacity: 1, y: 0 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 0 }}
                                transition={copyStateTransition}
                            >
                                <CopyIcon size={11} />
                                <span>copy</span>
                            </MotionSpan>
                        {/if}
                    </AnimatePresence>
                </MotionButton>
            </header>
            <div class="dk-coderef-code">
                {#if payload?.html}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- shiki-rendered HTML supplied by the consumer; treat as trusted input -->
                    <div class="shiki-light">{@html payload.html.light}</div>
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- shiki-rendered HTML supplied by the consumer; treat as trusted input -->
                    <div class="shiki-dark">{@html payload.html.dark}</div>
                {:else if payload}
                    <pre><code>{payload.code}</code></pre>
                {:else if hasError}
                    <div class="dk-coderef-placeholder">
                        <strong>failed to load code</strong>
                        <span>try reopening the panel</span>
                    </div>
                {:else}
                    <div class="dk-coderef-placeholder">
                        <strong>loading code</strong>
                        <span>fetching the highlighted snippet</span>
                    </div>
                {/if}
            </div>
        </article>
    {/each}
</div>

<style>
    .dk-coderef {
        display: grid;
        grid-template-columns: repeat(var(--dk-coderef-cols, 3), 1fr);
        gap: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .dk-coderef-cell {
        border-right: 1px solid var(--brut-rule);
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--brut-bg);
    }
    .dk-coderef-cell:last-child {
        border-right: 0;
    }

    /* ── Single header strip — tag / label / copy ─────────────────── */
    .dk-coderef-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    .dk-coderef-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }
    .dk-coderef-tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .dk-coderef-head h3 {
        margin: 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--brut-ink);
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dk-coderef :global(.dk-coderef-copy) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        width: 74px;
        height: 24px;
        padding: 4px 9px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        line-height: 1.2;
        text-transform: lowercase;
        letter-spacing: 0;
        cursor: pointer;
        flex-shrink: 0;
        transition:
            color 0.15s,
            border-color 0.15s,
            background 0.15s;
    }
    .dk-coderef :global(.dk-coderef-copy:hover) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .dk-coderef :global(.dk-coderef-copy.copied) {
        border-color: var(--brut-accent);
        background: var(
            --brut-accent-soft,
            color-mix(in srgb, var(--brut-accent) 10%, transparent)
        );
    }
    .dk-coderef :global(.dk-coderef-copy:disabled) {
        cursor: progress;
        opacity: 0.72;
    }
    .dk-coderef :global(.dk-coderef-copy-state) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        position: absolute;
        inset: 0;
        line-height: 1.2;
        white-space: nowrap;
    }
    .dk-coderef :global(.dk-coderef-copy-state.copy-state) {
        color: var(--brut-ink-2);
    }
    .dk-coderef :global(.dk-coderef-copy-state.copied-state) {
        color: var(--brut-accent);
    }
    .dk-coderef :global(.dk-coderef-copy-state.loading-state) {
        color: var(--brut-ink-3);
    }

    /* ── Code area — fills the cell so the scrollbar sits flush ───── */
    .dk-coderef-code {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    /* Each shiki variant + the fallback `<pre>` need to stretch to the
       full cell height so a sample shorter than its neighbours doesn't
       leave a weird blank strip below the code (and so the horizontal
       scrollbar — when present — lands at the bottom of the cell, not
       floating in the middle of the box). */
    .dk-coderef :global(.shiki-light),
    .dk-coderef :global(.shiki-dark) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        width: 100%;
    }
    .dk-coderef :global(.dk-coderef-code pre),
    .dk-coderef :global(.shiki-light pre),
    .dk-coderef :global(.shiki-dark pre) {
        flex: 1;
        margin: 0;
        padding: 14px 16px;
        background: var(--brut-bg) !important;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11.5px;
        line-height: 1.65;
        color: var(--brut-ink);
        overflow-x: auto;
        overflow-y: hidden;
        white-space: pre;
        border-radius: 0;
    }
    .dk-coderef :global(.dk-coderef-code pre code) {
        font-family: inherit;
        background: transparent;
    }
    .dk-coderef-placeholder {
        display: grid;
        min-height: 180px;
        place-content: center;
        gap: 6px;
        padding: 28px 18px;
        background: var(--brut-bg);
        color: var(--brut-ink-3);
        text-align: center;
    }
    .dk-coderef-placeholder strong {
        color: var(--brut-ink);
        font-size: 12px;
        text-transform: uppercase;
    }
    .dk-coderef-placeholder span {
        font-size: 11px;
    }

    /* Light/dark switching for shiki-rendered samples. Prose.css scopes
       its toggle to `.prose`, so we re-state it here on the grid root to
       make the component usable outside any prose container. */
    :global(html:not(.dark)) .dk-coderef :global(.shiki-dark) {
        display: none;
    }
    :global(html.dark) .dk-coderef :global(.shiki-light) {
        display: none;
    }

    @media (max-width: 1024px) {
        .dk-coderef {
            grid-template-columns: 1fr;
        }
        .dk-coderef-cell {
            border-right: 0;
            border-bottom: 1px solid var(--brut-rule);
        }
        .dk-coderef-cell:last-child {
            border-bottom: 0;
        }
    }
</style>
