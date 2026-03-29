<!--
  @component
  Blog index page: displays a list of blog posts with optional tag filtering.
-->
<script lang="ts">
    import type { BlogPostMeta } from '../types/blog.js'
    import { getAllTags, filterByTag } from '../utils/blog.js'
    import BlogCard from './BlogCard.svelte'

    const {
        posts,
        basePath = '/blog'
    }: {
        posts: BlogPostMeta[]
        basePath?: string
    } = $props()

    let activeTag: string | null = $state(null)

    const allTags = $derived(getAllTags(posts))
    const filteredPosts = $derived(
        activeTag ? filterByTag(posts, activeTag) : posts
    )

    const toggleTag = (tag: string) => {
        activeTag = activeTag === tag ? null : tag
    }
</script>

<div>
    {#if allTags.length > 0}
        <div class="mt-4 flex flex-wrap gap-2">
            {#each allTags as tag}
                <button
                    onclick={() => toggleTag(tag)}
                    class="rounded-full px-3 py-1 text-sm font-medium transition-colors {activeTag === tag
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-text-secondary hover:bg-muted/80'}"
                >
                    {tag}
                </button>
            {/each}
        </div>
    {/if}

    {#if filteredPosts.length === 0}
        <p class="mt-8 text-text-muted">No posts found.</p>
    {:else}
        <div class="mt-8 grid gap-4">
            {#each filteredPosts as post (post.slug)}
                <BlogCard {post} {basePath} />
            {/each}
        </div>
    {/if}
</div>
