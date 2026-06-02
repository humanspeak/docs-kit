<script lang="ts">
    import { OG, type DocsKitConfig } from '$lib'
    import '$lib/styles/fonts.css'

    const docsConfig: DocsKitConfig = {
        name: 'Svelte Motion',
        slug: 'motion',
        npmPackage: '@humanspeak/svelte-motion',
        repo: 'humanspeak/svelte-motion',
        url: 'https://motion.svelte.page',
        description:
            'Svelte Motion is a Framer Motion-compatible animation library for Svelte 5. Spring physics, gestures, layout animations, exit animations, and scroll effects with a familiar declarative API.',
        keywords: [
            'svelte',
            'animation',
            'motion',
            'framer-motion',
            'spring',
            'gestures',
            'layout',
            'scroll',
            'svelte-5',
            'typescript'
        ],
        defaultFeatures: [
            'AnimatePresence',
            'Spring Physics',
            'Gestures & Drag',
            'Layout Animation'
        ],
        fallbackStars: 200
    }

    const assetBaseUrl = '/src/lib/assets/svg'
    const compareFeatures = [
        'Feature Comparison',
        'Pros & Cons',
        'Migration Guide',
        'Honest Verdict'
    ]
    const title = `${docsConfig.name} vs Alternatives`
    const description = 'Honest, side-by-side comparisons.'
</script>

<svelte:head>
    <title>Social Card Preview</title>
</svelte:head>

<main class="preview-shell">
    <section class="preview-header">
        <div>
            <p class="eyebrow">docs-kit local harness</p>
            <h1>social card preview.</h1>
        </div>
        <div class="meta">
            <span>{docsConfig.npmPackage}</span>
            <span>{compareFeatures.length} features</span>
        </div>
    </section>

    <section class="preview-section" aria-labelledby="og-preview">
        <div class="section-heading">
            <h2 id="og-preview">Open Graph</h2>
            <span>1200 x 630</span>
        </div>
        <div class="card-viewport og">
            <div class="card-scale">
                <OG
                    type="og"
                    url={assetBaseUrl}
                    config={docsConfig}
                    {title}
                    {description}
                    features={compareFeatures}
                />
            </div>
        </div>
    </section>

    <section class="preview-section" aria-labelledby="twitter-preview">
        <div class="section-heading">
            <h2 id="twitter-preview">Twitter</h2>
            <span>1200 x 600</span>
        </div>
        <div class="card-viewport twitter">
            <div class="card-scale">
                <OG
                    type="twitter"
                    url={assetBaseUrl}
                    config={docsConfig}
                    {title}
                    {description}
                    features={compareFeatures}
                />
            </div>
        </div>
    </section>
</main>

<style>
    :global(html) {
        background: #070707;
        color: #f5f5f5;
        color-scheme: dark;
    }

    :global(body) {
        margin: 0;
        font-family:
            'lato',
            Inter,
            system-ui,
            sans-serif;
    }

    .preview-shell {
        min-height: 100vh;
        padding: 40px 24px 72px;
    }

    .preview-header,
    .preview-section {
        max-width: 1240px;
        margin: 0 auto;
    }

    .preview-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 28px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    }

    .eyebrow {
        margin: 0 0 8px;
        color: #ff7a45;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    h1,
    h2 {
        margin: 0;
        letter-spacing: 0;
        font-family: 'lato-extrabold', 'lato', sans-serif;
    }

    h1 {
        font-size: clamp(36px, 7vw, 76px);
        line-height: 0.95;
        text-transform: lowercase;
    }

    h2 {
        font-size: 22px;
        line-height: 1.1;
    }

    .meta,
    .section-heading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.66);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
    }

    .meta span,
    .section-heading span {
        border: 1px solid rgba(255, 255, 255, 0.14);
        padding: 8px 10px;
    }

    .preview-section {
        padding-top: 36px;
    }

    .section-heading {
        justify-content: space-between;
        margin-bottom: 14px;
    }

    .section-heading h2 {
        color: #ffffff;
    }

    .card-viewport {
        overflow: auto;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background:
            linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px),
            #111;
        background-size: 24px 24px;
        padding: 20px;
    }

    .card-scale {
        width: 1200px;
        transform-origin: top left;
    }

    .card-scale :global(#social-card) {
        box-sizing: border-box;
    }

    .og {
        min-height: min(630px, calc((100vw - 88px) * 0.525 + 40px));
    }

    .twitter {
        min-height: min(600px, calc((100vw - 88px) * 0.5 + 40px));
    }

    @media (max-width: 1288px) {
        .card-scale {
            transform: scale(calc((100vw - 88px) / 1200));
        }
    }

    @media (max-width: 760px) {
        .preview-shell {
            padding: 28px 16px 48px;
        }

        .preview-header {
            display: block;
        }

        .meta {
            flex-wrap: wrap;
            margin-top: 18px;
        }

        .card-viewport {
            padding: 12px;
        }

        .card-scale {
            transform: scale(calc((100vw - 56px) / 1200));
        }

        .og {
            min-height: calc((100vw - 56px) * 0.525 + 24px);
        }

        .twitter {
            min-height: calc((100vw - 56px) * 0.5 + 24px);
        }
    }
</style>
