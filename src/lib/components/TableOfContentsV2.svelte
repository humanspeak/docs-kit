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

    function updateActiveHeading() {
        if (headings.length === 0) {
            activeHeading = ''
            return
        }
        for (let i = headings.length - 1; i >= 0; i--) {
            const h = headings[i]
            if (h?.element) {
                const rect = h.element.getBoundingClientRect()
                if (rect.top <= 100) {
                    activeHeading = h.id
                    return
                }
            }
        }
        if (headings[0]?.id) activeHeading = headings[0].id
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
        activeHeading = ''
        updateActiveHeading()
        const container = getScrollContainer(headings[0]?.element)
        const add = (t: HTMLElement | Window) => t.addEventListener('scroll', updateActiveHeading)
        const remove = (t: HTMLElement | Window) =>
            t.removeEventListener('scroll', updateActiveHeading)
        add(container)
        window.addEventListener('resize', updateActiveHeading)
        return () => {
            remove(container)
            window.removeEventListener('resize', updateActiveHeading)
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
