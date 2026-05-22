<!--
  @component
  Brutalist-mono blog post wrapper (v2).

  Drop-in shape-compatible with v1 `BlogPost` (`post` + `config` + optional
  `basePath` + `children`) but renders the brut sheet hero strip + prose
  body in a centered max-width container. Mount inside `.brut-wrap`
  (e.g. inside `BlogLayoutV2`).

  Usage inside a `.svx` post file:

  ```svelte
  <script lang="ts">
    import { BlogPostV2, type BlogPostMeta } from '@humanspeak/docs-kit/blog'
    import { docsConfig } from '$lib/docs-config'
    const post: BlogPostMeta = { … }
  </script>

  <BlogPostV2 {post} config={docsConfig}>
    Markdown body goes here.
  </BlogPostV2>
  ```

  Body typography lives inside `.brut-post-body` and uses the `.brut`
  Inter/JetBrains-Mono stack with hairline rules — no Tailwind `prose`
  required.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { DocsKitConfig } from '../config.js'
    import { getSeoContext } from '../contexts/seo.js'
    import type { BlogPostMeta } from '../types/blog.js'
    import BlogArticleJsonLd from './BlogArticleJsonLd.svelte'

    interface Props {
        post: BlogPostMeta
        config: DocsKitConfig
        basePath?: string
        children: Snippet
    }

    const { post, config, basePath = '/blog', children }: Props = $props()

    const seo = getSeoContext()

    $effect(() => {
        if (seo) {
            seo.title = `${post.title} | ${config.name}`
            seo.description = post.description
            seo.ogSlug = post.ogSlug ?? `blog-${post.slug}`
            seo.ogTitle = post.title
        }
    })

    const formattedDate = $derived(
        new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    )

    const COORD_MARKERS = Array.from({ length: 12 }, (_, i) => i)
</script>

<BlogArticleJsonLd {post} {config} {basePath} />

<main class="brut">
    <!-- ── Coordinate strip ─────────────────────────────────────── -->
    <div class="brut-coord" aria-hidden="true">
        {#each COORD_MARKERS as i (i)}
            <div>{String(i + 1).padStart(2, '0')}</div>
        {/each}
    </div>

    <!-- ── Article hero strip ───────────────────────────────────── -->
    <header class="post-hero">
        <div class="corner tr">FIG-001 · BLOG POST</div>
        <aside class="meta">
            <div><span class="k">date</span> · <span class="v">{formattedDate}</span></div>
            <div><span class="k">read</span> · <span class="v">{post.readingTime} min</span></div>
            <div><span class="k">author</span> · <span class="v">{post.author}</span></div>
            {#if post.tags.length > 0}
                <hr />
                <div class="tag-rail">
                    {#each post.tags as tag (tag)}
                        <span>{tag}</span>
                    {/each}
                </div>
            {/if}
        </aside>
        <div class="hero-body">
            <div class="k">// notes / {post.slug}</div>
            <h1>{post.title.toLowerCase()}<span class="end">.</span></h1>
            <p class="sub">{post.description}</p>
        </div>
        <div class="corner bl">FIG-001</div>
        <div class="corner br">SHEET 01 / 02</div>
    </header>

    <!-- ── Prose body ───────────────────────────────────────────── -->
    <article class="brut-post-body">
        {@render children()}
    </article>

    <!-- ── Footer link strip ────────────────────────────────────── -->
    <section class="post-foot">
        <a class="back" href={basePath}>← all posts</a>
        <div class="meta-line">
            <span>{post.slug}</span>
            <span aria-hidden="true">·</span>
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readingTime} min</span>
        </div>
        <a class="top" href="#top">↩ to top</a>
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
    .post-hero {
        padding: 56px 24px 36px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .post-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .post-hero .meta .v {
        color: var(--brut-ink);
    }
    .post-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .post-hero .tag-rail {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .post-hero .tag-rail span {
        font-size: 10px;
        padding: 2px 6px;
        border: 1px solid var(--brut-rule);
        color: var(--brut-ink-2);
        letter-spacing: 0.06em;
        text-transform: lowercase;
    }
    .post-hero .hero-body .k {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .post-hero h1 {
        margin: 12px 0 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 6.5vw, 88px);
        line-height: 0.96;
        font-weight: 500;
        letter-spacing: -0.04em;
        color: var(--brut-ink);
        text-transform: lowercase;
    }
    .post-hero h1 .end {
        color: var(--brut-accent);
    }
    .post-hero .sub {
        margin: 22px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .post-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .post-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .post-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .post-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── Body ────────────────────────────────────────────────── */
    .brut-post-body {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink);
        font-size: 17px;
        line-height: 1.65;
        letter-spacing: -0.005em;
    }
    .brut-post-body :global(h2) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 56px 0 16px;
        color: var(--brut-ink);
        text-transform: lowercase;
        scroll-margin-top: 96px;
    }
    .brut-post-body :global(h3) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 20px;
        font-weight: 500;
        letter-spacing: -0.015em;
        margin: 40px 0 12px;
        color: var(--brut-ink);
        text-transform: lowercase;
        scroll-margin-top: 96px;
    }
    .brut-post-body :global(h4) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0;
        margin: 28px 0 10px;
        color: var(--brut-ink);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .brut-post-body :global(p) {
        margin: 16px 0;
        color: var(--brut-ink);
    }
    .brut-post-body :global(a) {
        color: var(--brut-accent);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
    }
    .brut-post-body :global(a:hover) {
        color: var(--brut-accent-hover);
    }
    .brut-post-body :global(ul),
    .brut-post-body :global(ol) {
        margin: 16px 0;
        padding-left: 22px;
    }
    .brut-post-body :global(li) {
        margin: 6px 0;
    }
    .brut-post-body :global(strong) {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-post-body :global(em) {
        font-style: italic;
    }
    .brut-post-body :global(blockquote) {
        margin: 24px 0;
        padding: 4px 0 4px 20px;
        border-left: 2px solid var(--brut-accent);
        color: var(--brut-ink-2);
        font-style: italic;
    }
    .brut-post-body :global(blockquote p) {
        margin: 8px 0;
    }
    .brut-post-body :global(hr) {
        border: 0;
        border-top: 1px solid var(--brut-rule);
        margin: 40px 0;
    }
    .brut-post-body :global(img) {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 24px auto;
        border: 1px solid var(--brut-rule);
    }
    .brut-post-body :global(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0;
        font-size: 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .brut-post-body :global(th),
    .brut-post-body :global(td) {
        padding: 8px 12px;
        text-align: left;
        border: 1px solid var(--brut-rule);
    }
    .brut-post-body :global(th) {
        background: var(--brut-bg-2);
        font-weight: 600;
        color: var(--brut-ink);
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
    }
    /* Inline code chips */
    .brut-post-body :global(:not(pre) > code) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 5px;
        font-size: 14.5px;
        color: var(--brut-ink);
        border-radius: 0;
    }
    /* Code blocks — leave most styling to Shiki / enhanceCodeBlocks but
       make sure the container fits the brut aesthetic. */
    .brut-post-body :global(pre) {
        margin: 24px 0;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        padding: 16px 18px;
        overflow-x: auto;
        font-size: 13.5px;
        line-height: 1.55;
        border-radius: 0;
    }
    .brut-post-body :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
        font-size: inherit;
    }

    /* ── Footer link strip ───────────────────────────────────── */
    .post-foot {
        padding: 24px 24px 48px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        border-top: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.08em;
        text-transform: lowercase;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .post-foot .back,
    .post-foot .top {
        color: var(--brut-ink-2);
        text-decoration: none;
        transition: color 0.15s;
    }
    .post-foot .back:hover,
    .post-foot .top:hover {
        color: var(--brut-accent);
    }
    .post-foot .meta-line {
        display: inline-flex;
        gap: 8px;
        justify-self: center;
    }
    .post-foot .top {
        justify-self: end;
    }

    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .post-hero {
            grid-template-columns: 1fr;
            padding-top: 40px;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-post-body {
            padding: 32px 16px;
        }
        .post-foot {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 8px;
            padding-left: 16px;
            padding-right: 16px;
        }
        .post-foot .meta-line,
        .post-foot .top {
            justify-self: center;
        }
    }
</style>
