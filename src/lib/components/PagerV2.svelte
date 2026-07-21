<!--
  @component
  Brutalist-mono prev/next pager (v2).

  A sheet-style pagination strip meant to sit flush above `FooterV2` on
  detail pages that belong to an ordered collection (example galleries,
  blog posts, doc chapters). Left and right cells link to the previous /
  next entries with their `№` numbers; the center cell shows the current
  sheet position. Ends wrap around by default, and the strip pins itself
  to the bottom of a flex-column parent (`margin-top: auto`) so short
  pages don't leave it floating mid-viewport.

  Resolves the current entry by matching `currentHref` (defaults to the
  live `page.url.pathname`) against `items`; renders nothing when the
  current route isn't in the list, so it can sit unconditionally in a
  layout shared with an index page.

  Sits inside `BrutLayoutV2` / `ExampleLayoutV2`; the parent provides the
  brutalist surface tokens (`--brut-rule-2`, `--brut-accent`, etc.) via
  `@humanspeak/docs-kit/styles/brutalist.css`.

  Wiring:

  ```svelte
  <PagerV2
      items={examples.map((example) => ({ href: example.route, label: `${example.slug}.` }))}
  />
  ```
-->
<script lang="ts">
    import { MotionA } from '@humanspeak/svelte-motion'
    import { page } from '$app/state'
    import type { PagerItem } from '../types/brut.js'

    interface Props {
        /** Ordered collection entries; order defines the `№` numbering. */
        items: PagerItem[]
        /**
         * Href of the current entry. Defaults to the live pathname, so a
         * layout can mount the pager once and let each page resolve itself.
         */
        currentHref?: string
        /** Center cell caption. Defaults to `sheet`. */
        counterLabel?: string
        /** Accessible label for the `<nav>`. Defaults to `Pagination`. */
        ariaLabel?: string
        /** Wrap from last → first and first → last. Defaults to `true`. */
        wrap?: boolean
    }

    const {
        items,
        currentHref = undefined,
        counterLabel = 'sheet',
        ariaLabel = 'Pagination',
        wrap = true
    }: Props = $props()

    const pad2 = (n: number) => String(n).padStart(2, '0')

    const current = $derived.by(() => {
        const href = currentHref ?? page.url.pathname
        const index = items.findIndex((item) => item.href === href)
        if (index === -1 || items.length < 2) return null

        const previousIndex = index === 0 ? (wrap ? items.length - 1 : -1) : index - 1
        const nextIndex = index === items.length - 1 ? (wrap ? 0 : -1) : index + 1
        return {
            index,
            previous:
                previousIndex === -1 ? null : { ...items[previousIndex], n: previousIndex + 1 },
            next: nextIndex === -1 ? null : { ...items[nextIndex], n: nextIndex + 1 }
        }
    })
</script>

{#if current}
    <div class="dk-pager-push">
        <nav class="dk-pager" aria-label={ariaLabel}>
            {#if current.previous}
                <MotionA
                    href={current.previous.href}
                    class="dk-pager-cell dk-pager-prev"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <span class="dk-pager-micro">↤ prev / № {pad2(current.previous.n)}</span>
                    <span class="dk-pager-name">{current.previous.label}</span>
                </MotionA>
            {:else}
                <div class="dk-pager-cell" aria-hidden="true"></div>
            {/if}
            <div class="dk-pager-cell dk-pager-counter" aria-hidden="true">
                <span class="dk-pager-micro">{counterLabel}</span>
                <span class="dk-pager-name dk-pager-accent">
                    № {pad2(current.index + 1)} / {pad2(items.length)}
                </span>
            </div>
            {#if current.next}
                <MotionA
                    href={current.next.href}
                    class="dk-pager-cell dk-pager-next"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <span class="dk-pager-micro">next / № {pad2(current.next.n)} ↦</span>
                    <span class="dk-pager-name">{current.next.label}</span>
                </MotionA>
            {:else}
                <div class="dk-pager-cell" aria-hidden="true"></div>
            {/if}
        </nav>
    </div>
{/if}

<style>
    .dk-pager-push {
        margin-top: auto;
        padding-top: 2rem;
    }

    .dk-pager {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        border-top: 1px solid var(--brut-rule-2);
    }

    .dk-pager :global(.dk-pager-cell) {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 1rem 1.25rem;
        text-decoration: none;
    }

    .dk-pager :global(.dk-pager-cell + .dk-pager-cell) {
        border-left: 1px dashed var(--brut-rule-2);
    }

    .dk-pager :global(.dk-pager-prev) {
        align-items: flex-start;
    }

    .dk-pager-counter {
        align-items: center;
        justify-content: center;
    }

    .dk-pager :global(.dk-pager-next) {
        align-items: flex-end;
        text-align: right;
    }

    .dk-pager :global(.dk-pager-micro) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.6875rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }

    .dk-pager :global(.dk-pager-name) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--brut-ink);
    }

    .dk-pager :global(.dk-pager-accent) {
        color: var(--brut-accent);
    }

    .dk-pager :global(a.dk-pager-cell:hover) {
        background: var(--brut-accent-soft);
    }

    .dk-pager :global(a.dk-pager-cell:hover .dk-pager-name) {
        color: var(--brut-accent);
    }

    @media (max-width: 640px) {
        .dk-pager {
            grid-template-columns: 1fr 1fr;
        }

        .dk-pager-counter {
            display: none;
        }
    }
</style>
