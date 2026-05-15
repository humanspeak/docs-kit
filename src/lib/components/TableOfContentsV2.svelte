<!--
  @component
  Brutalist-mono table of contents (v2).

  Drop-in shape-compatible with the v1 `TableOfContents` (`headings` prop).
  Visual contract:
   - "ON THIS PAGE" header in uppercase mono caps.
   - Hairline left border for the list with an accent left bar on the
     active heading.
   - Indentation by heading level via the `--toc-indent` step.
-->
<script lang="ts">
    import { afterNavigate } from '$app/navigation'
    import { untrack } from 'svelte'
    import type { TocHeading } from '../utils/headings.js'

    const { headings = [] } = $props<{ headings: TocHeading[] }>()

    let activeHeading = $state<string>('')

    function scrollToHeading(id: string) {
        const element = document.getElementById(id)
        if (!element) return
        activeHeading = id
        const top = element.getBoundingClientRect().top + window.scrollY - 20
        window.scrollTo({ top, behavior: 'smooth' })
    }

    /** Compute the active id without mutating state. */
    function computeActive(): string {
        if (headings.length === 0) return ''
        for (let i = headings.length - 1; i >= 0; i--) {
            const h = headings[i]
            if (!h?.element) continue
            if (h.element.getBoundingClientRect().top <= 100) return h.id
        }
        return headings[0]?.id ?? ''
    }

    /** Apply the new active id, skipping the rune write when nothing changed.
     *  The `activeHeading` read inside the guard is wrapped in `untrack` so
     *  callers from inside a `$effect` don't accumulate a self-cycle:
     *  reading `activeHeading` would otherwise subscribe the calling effect
     *  to its own write, and the unconditional reset on effect start would
     *  re-trigger every run. The on-screen TOC state still updates because
     *  the assignment notifies *other* consumers (the template). */
    function updateActiveHeading() {
        const next = computeActive()
        untrack(() => {
            if (next !== activeHeading) activeHeading = next
        })
    }

    function getScrollContainer(start: HTMLElement | undefined): HTMLElement | Window {
        if (!start) return window
        let node: HTMLElement | null = start.parentElement
        while (node && node !== document.body) {
            const overflow = getComputedStyle(node).overflowY
            if (
                (overflow === 'auto' || overflow === 'scroll') &&
                node.scrollHeight > node.clientHeight
            ) {
                return node
            }
            node = node.parentElement
        }
        return window
    }

    $effect(() => {
        // Reset on route change so the previous page's active id doesn't
        // carry over. Wrapped in `untrack` so this write doesn't subscribe
        // the effect to its own future writes (which would cycle).
        untrack(() => {
            activeHeading = ''
        })
        updateActiveHeading()

        // rAF-throttle scroll/resize: at most one layout read per frame.
        let ticking = false
        const onTick = () => {
            if (ticking) return
            ticking = true
            requestAnimationFrame(() => {
                ticking = false
                updateActiveHeading()
            })
        }

        const container = getScrollContainer(headings[0]?.element)
        container.addEventListener('scroll', onTick, { passive: true })
        window.addEventListener('resize', onTick, { passive: true })
        return () => {
            container.removeEventListener('scroll', onTick)
            window.removeEventListener('resize', onTick)
        }
    })

    afterNavigate(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(updateActiveHeading)
        })
    })
</script>

{#if headings.length > 0}
    <nav class="dk-toc-v2" aria-label="Table of contents">
        <div class="dk-toc-header">
            <span class="dk-toc-k">ON THIS PAGE</span>
        </div>
        <ul class="dk-toc-list">
            {#each headings as heading (heading.id)}
                {@const active = activeHeading === heading.id}
                <li
                    class="dk-toc-li {active ? 'active' : ''}"
                    style="--toc-indent: {(heading.level - 1) * 10}px"
                >
                    <button
                        type="button"
                        onclick={() => scrollToHeading(heading.id)}
                        class="dk-toc-btn"
                    >
                        <span class="dk-toc-bar" aria-hidden="true"></span>
                        <span class="dk-toc-text">{heading.text}</span>
                    </button>
                </li>
            {/each}
        </ul>
    </nav>
{/if}

<style>
    .dk-toc-v2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        padding: 20px 18px;
        color: var(--foreground);
    }
    .dk-toc-header {
        padding: 0 0 12px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 10px;
    }
    .dk-toc-k {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--muted-foreground);
    }
    .dk-toc-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .dk-toc-li {
        margin: 0;
        padding: 0;
        padding-left: var(--toc-indent, 0px);
    }
    .dk-toc-btn {
        position: relative;
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: 0;
        padding: 4px 10px;
        font-family: inherit;
        font-size: 12px;
        line-height: 1.45;
        color: var(--muted-foreground);
        text-transform: lowercase;
        letter-spacing: -0.005em;
        cursor: pointer;
        transition: color 0.15s;
    }
    .dk-toc-btn:hover {
        color: var(--foreground);
    }
    .dk-toc-bar {
        position: absolute;
        left: 0;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: transparent;
        transition: background 0.15s;
    }
    .dk-toc-li.active .dk-toc-btn {
        color: var(--color-brand-600, var(--brand-600, var(--accent)));
        font-weight: 500;
    }
    .dk-toc-li.active .dk-toc-bar {
        background: var(--color-brand-500, var(--brand-500, var(--accent)));
    }
    :global(.dark) .dk-toc-li.active .dk-toc-btn {
        color: var(--color-brand-400, var(--brand-400, var(--accent)));
    }
</style>
