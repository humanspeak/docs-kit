<!--
  @component
  Brutalist-mono slug strip.

  Slim mono band intended to sit immediately below a HeaderV2 on doc
  pages. Surfaces the current slug + a kind/category marker so the
  reading experience visually ties into the brutalist marketing pages.

  Defaults match the svelte-motion docs layout: "FIG-DOC · slug · <slug> · // reference".
  Override `figLabel`, `kindLabel`, and `tail` to repurpose for other
  surfaces (e.g. "FIG-BLOG · post · my-post · // article").
-->
<script lang="ts">
    interface Props {
        slug: string
        figLabel?: string
        kindLabel?: string
        tail?: string
    }

    const {
        slug,
        figLabel = 'FIG-DOC',
        kindLabel = 'slug',
        tail = '// reference'
    }: Props = $props()
</script>

<div class="dk-slug-strip" aria-hidden="true">
    <div class="dk-slug-inner">
        <span class="dk-slug-k">{figLabel}</span>
        <span class="dk-slug-sep">·</span>
        <span class="dk-slug-k">{kindLabel}</span>
        <span class="dk-slug-sep">·</span>
        <span class="dk-slug-v">{slug}</span>
        <span class="dk-slug-grow"></span>
        <span class="dk-slug-k accent">{tail}</span>
    </div>
</div>

<style>
    .dk-slug-strip {
        border-bottom: 1px solid var(--border);
        background: color-mix(in srgb, var(--card, var(--background)) 60%, transparent);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--muted-foreground);
    }
    .dk-slug-inner {
        padding: 7px 24px;
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
    }
    .dk-slug-k {
        color: var(--muted-foreground);
    }
    .dk-slug-v {
        color: var(--foreground);
        text-transform: lowercase;
        letter-spacing: 0;
    }
    .dk-slug-sep {
        color: var(--muted-foreground);
        opacity: 0.5;
    }
    .dk-slug-grow {
        flex: 1;
    }
    .dk-slug-k.accent {
        color: var(--brand-500, var(--accent));
    }
    :global(.dark) .dk-slug-k.accent {
        color: var(--brand-400, var(--accent));
    }
    @media (max-width: 720px) {
        .dk-slug-inner {
            padding: 7px 16px;
        }
    }
</style>
