<!--
  @component
  Blog post preview card for the blog index page.
-->
<script lang="ts">
    import type { BlogPostMeta } from '../types/blog.js'

    const {
        post,
        basePath = '/blog'
    }: {
        post: BlogPostMeta
        basePath?: string
    } = $props()

    const formattedDate = $derived(
        new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    )
</script>

<a
    href="{basePath}/{post.slug}"
    class="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-card/80"
>
    <div class="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <time datetime={post.date}>{formattedDate}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{post.readingTime} min read</span>
    </div>

    <h2 class="mt-2 text-xl font-semibold text-text-primary group-hover:text-primary">
        {post.title}
    </h2>

    <p class="mt-2 text-text-secondary line-clamp-2">
        {post.description}
    </p>

    {#if post.tags.length > 0}
        <div class="mt-3 flex flex-wrap gap-1.5">
            {#each post.tags as tag}
                <span
                    class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                >
                    {tag}
                </span>
            {/each}
        </div>
    {/if}
</a>
