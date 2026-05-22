<!--
  @component
  Brutalist-mono blog index (v2).

  Drop-in shape-compatible with v1 `BlogIndex` (`posts` + optional
  `basePath`) but renders the full sheet: coordinate strip, compact
  hero, mono tag-filter chips, and a numbered vertical list of post
  rows. Mount inside a `.brut-wrap` page (e.g. `BlogLayoutV2`).

  ```svelte
  <script lang="ts">
    import { BlogIndexV2, loadBlogPostsMdsvex } from '@humanspeak/docs-kit/blog'
    const modules = import.meta.glob('/src/routes/blog/[slug]/+page.svx', { eager: true })
    const posts = loadBlogPostsMdsvex(modules)
  </script>

  <BlogIndexV2 {posts} />
  ```

  The hero copy and footer text are intentionally generic; consumers
  that want bespoke wording for `/blog` should swap to a custom mount
  built on `BrutIndexV2` directly. Most sites are fine with the
  defaults.
-->
<script lang="ts">
    import type { BlogPostMeta } from '../types/blog.js'
    import { filterByTag, getAllTags } from '../utils/blog.js'

    interface Props {
        /** Posts to render, newest-first. */
        posts: BlogPostMeta[]
        /** Base path for post links. Default `/blog`. */
        basePath?: string
        /** Big-type footer link. Default: links back to the docs index. */
        footerCta?: { prefix: string; accent: string; href: string; hint?: string }
    }

    const {
        posts,
        basePath = '/blog',
        footerCta = {
            prefix: 'read the ',
            accent: 'docs',
            href: '/docs',
            hint: 'every defense, every renderer'
        }
    }: Props = $props()

    let activeTag: string | null = $state(null)
    const allTags = $derived(getAllTags(posts))
    const visible = $derived(activeTag ? filterByTag(posts, activeTag) : posts)

    const toggleTag = (tag: string) => {
        activeTag = activeTag === tag ? null : tag
    }

    const pad2 = (n: number) => String(n).padStart(2, '0')

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })

    const COORD_MARKERS = Array.from({ length: 12 }, (_, i) => i)
</script>

<main class="brut">
    <!-- ── Coordinate strip ─────────────────────────────────────── -->
    <div class="brut-coord" aria-hidden="true">
        {#each COORD_MARKERS as i (i)}
            <div>{pad2(i + 1)}</div>
        {/each}
    </div>

    <!-- ── FIG-001 · MASTHEAD ───────────────────────────────────── -->
    <section class="hero">
        <div class="corner tr">FIG-001 · BLOG INDEX</div>
        <aside class="meta">
            <div><span class="k">posts</span> · <span class="v">{posts.length}</span></div>
            <div><span class="k">format</span> · <span class="v">long-form</span></div>
            <div><span class="k">cadence</span> · <span class="v">irregular</span></div>
            <hr />
            <div><span class="k">topics</span> · <span class="v accent">agents · streaming · xss</span></div>
        </aside>
        <div class="hero-body">
            <div class="k">// notes from the field</div>
            <h1>
                <span>blog</span><span class="end">.</span>
            </h1>
            <p class="sub">
                Long-form notes on rendering streaming AI agent output safely — security,
                sanitization, performance, and the patterns that hold up in production.
            </p>
        </div>
        <div class="corner bl">FIG-001</div>
        <div class="corner br">SHEET 01 / 02</div>
    </section>

    <!-- ── Filter strip + post list ─────────────────────────────── -->
    <section class="list-section">
        <div class="lede">
            <div class="k">FIG-002 / POSTS</div>
            <h2>
                latest <span>writing</span>.
            </h2>
            {#if allTags.length > 0}
                <div class="tags" role="group" aria-label="Filter by tag">
                    {#each allTags as tag (tag)}
                        <button
                            type="button"
                            class="tag"
                            class:active={activeTag === tag}
                            aria-pressed={activeTag === tag}
                            onclick={() => toggleTag(tag)}
                        >
                            {tag}
                        </button>
                    {/each}
                    {#if activeTag}
                        <button
                            type="button"
                            class="tag tag-clear"
                            onclick={() => (activeTag = null)}
                            aria-label="Clear filter"
                        >
                            × clear
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
        <div class="list">
            {#if visible.length === 0}
                <p class="empty">No posts match this filter.</p>
            {:else}
                {#each visible as post, i (post.slug)}
                    <a class="row" href="{basePath}/{post.slug}">
                        <div class="id">№ {pad2(i + 1)} / {pad2(visible.length)}</div>
                        <div class="body">
                            <div class="meta-row">
                                <time datetime={post.date}>{formatDate(post.date)}</time>
                                <span aria-hidden="true">·</span>
                                <span>{post.readingTime} min</span>
                                <span aria-hidden="true">·</span>
                                <span>{post.author}</span>
                            </div>
                            <h3>{post.title}</h3>
                            <p class="line">{post.description}</p>
                            {#if post.tags.length > 0}
                                <div class="row-tags">
                                    {#each post.tags as tag (tag)}
                                        <span class="row-tag">{tag}</span>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <div class="arrow" aria-hidden="true">↗</div>
                    </a>
                {/each}
            {/if}
        </div>
    </section>

    <!-- ── Big-type footer ──────────────────────────────────────── -->
    <section class="foot">
        <div class="info">
            <div>SET / JETBRAINS MONO + INTER</div>
            <div>HUMANSPEAK · 2026</div>
            <div>MIT LICENCE</div>
        </div>
        <a class="big" href={footerCta.href}>
            {footerCta.prefix}<br /><span>{footerCta.accent}</span> →
            <span class="copy-hint">{footerCta.hint ?? 'open ↗'}</span>
        </a>
        <div class="info right">
            <div>SHEET 02 / 02</div>
            <div>END OF INDEX</div>
            <a class="v" href="/">↩ HOME</a>
        </div>
    </section>
</main>

<style>
    /* Brutalist tokens + .brut / .brut-wrap base styles live in
       @humanspeak/docs-kit/styles/brutalist.css (imported via app.css). */

    /* ── Coordinate strip ────────────────────────────────────── */
    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    /* ── Hero ────────────────────────────────────────────────── */
    .hero {
        padding: 64px 24px 36px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .hero .meta .k {
        color: var(--brut-ink-3);
    }
    .hero .meta .v {
        color: var(--brut-ink);
    }
    .hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .hero .hero-body .k {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .hero h1 {
        margin: 8px 0 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(56px, 11vw, 152px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }
    .hero h1 span {
        color: var(--brut-accent);
    }
    .hero h1 .end {
        color: var(--brut-ink-3);
    }
    .hero .sub {
        margin: 24px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── List section ────────────────────────────────────────── */
    .list-section {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .list-section .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .list-section .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .list-section .lede h2 span {
        color: var(--brut-accent);
    }

    /* Tag filter chips */
    .tags {
        margin: 16px 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
    }
    .tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        padding: 6px 10px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        text-transform: lowercase;
        cursor: pointer;
        letter-spacing: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .tag + .tag {
        margin-left: -1px;
    }
    .tag:hover {
        background: var(--brut-bg-2);
        color: var(--brut-ink);
    }
    .tag.active {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
        color: var(--brut-accent-ink);
    }
    .tag-clear {
        margin-left: 8px;
        color: var(--brut-ink-3);
    }

    /* Post rows */
    .list {
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--brut-rule);
        border-left: 1px solid var(--brut-rule);
        border-right: 1px solid var(--brut-rule);
    }
    .empty {
        padding: 24px;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        border-bottom: 1px solid var(--brut-rule);
    }
    .row {
        display: grid;
        grid-template-columns: 110px 1fr 32px;
        gap: 16px;
        padding: 22px 22px 24px;
        border-bottom: 1px solid var(--brut-rule);
        text-decoration: none;
        color: var(--brut-ink);
        background: var(--brut-bg);
        position: relative;
        transition: background 0.15s;
    }
    .row:hover {
        background: var(--brut-bg-2);
    }
    .row .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        padding-top: 4px;
    }
    .row .body {
        min-width: 0;
    }
    .row .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.06em;
        text-transform: lowercase;
    }
    .row h3 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 24px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 10px 0 0;
        color: var(--brut-ink);
        text-transform: lowercase;
        transition: color 0.15s;
    }
    .row:hover h3 {
        color: var(--brut-accent);
    }
    .row .line {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 14px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 10px 0 0;
        max-width: 720px;
    }
    .row-tags {
        margin: 14px 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .row-tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        padding: 2px 7px;
        border: 1px solid var(--brut-rule);
        color: var(--brut-ink-3);
        letter-spacing: 0.06em;
        text-transform: lowercase;
    }
    .row .arrow {
        align-self: start;
        text-align: right;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition: color 0.15s;
    }
    .row:hover .arrow {
        color: var(--brut-accent);
    }

    /* ── Big-type footer ─────────────────────────────────────── */
    .foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .foot .big {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
        letter-spacing: -0.06em;
        text-transform: lowercase;
        color: var(--brut-ink);
        text-decoration: none;
        display: inline-block;
    }
    .foot .big span {
        color: var(--brut-accent);
    }
    .foot .big .copy-hint {
        display: block;
        margin-top: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .foot .big:hover .copy-hint {
        color: var(--brut-accent);
    }
    .foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .foot .info.right {
        text-align: right;
    }
    .foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .foot .info a.v:hover {
        color: var(--brut-accent);
    }

    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .hero,
        .list-section {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .hero {
            padding-top: 48px;
        }
        .row {
            grid-template-columns: 1fr;
            gap: 8px;
        }
        .row .arrow {
            display: none;
        }
        .foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .foot .info.right {
            text-align: left;
        }
    }
</style>
