<script lang="ts">
    import {
        CodeReferenceV2,
        EmbeddedExampleV2,
        ExampleV2,
        enhanceCodeBlocks
    } from '$lib'
    import '$lib/styles/brutalist.css'
    import '$lib/styles/prose-v2.css'

    const codeSample = `import { animate } from '@humanspeak/svelte-motion'

const button = document.querySelector('button')

button?.addEventListener('click', () => {
    animate(button, { scale: [0.96, 1.04, 1] }, { duration: 0.28 })
})`
</script>

{#snippet codePanel()}
    <CodeReferenceV2
        samples={[
            {
                id: 'copy',
                label: 'CodeReferenceV2 copy feedback',
                code: codeSample
            }
        ]}
        columns={1}
    />
{/snippet}

<div class="brut-wrap">
    <main class="brut harness">
        <section class="intro">
            <p class="eyebrow">docs-kit local harness</p>
            <h1>code block button.</h1>
            <p>
                Use this page to verify the docs code-copy affordances on docs-kit
                <code>main</code>: the show-code copy button, reset spin, source link target,
                and prose code-block enhancer.
            </p>
        </section>

        <ExampleV2
            figId="FIG-001"
            tag="DOCS"
            title={{ prefix: 'show code ', accent: 'copy feedback', end: '.' }}
            description="Open the code panel, press copy, and verify the label swaps in place without the text jumping outside the button shell."
            mode="live"
            sourceUrl="https://github.com/humanspeak/docs-kit/blob/main/src/lib/components/CodeReferenceV2.svelte"
            codeSnippet={codePanel}
            codeLabel="show code"
            barCells={[{ k: 'component', v: 'CodeReferenceV2' }]}
        >
            <div class="demo-card">
                <span class="chip">copy</span>
                <strong>stable shell</strong>
                <p>Hover, tap, and copied-state feedback should feel like one composed control.</p>
            </div>
        </ExampleV2>

        <section class="inline-panel">
            <div class="lede">
                <p class="eyebrow">embedded reset</p>
                <h2>one full spin.</h2>
                <p>The reset icon should rotate once when the demo remounts.</p>
            </div>
            <EmbeddedExampleV2
                label="Embedded reset demo"
                sourceUrl="https://github.com/humanspeak/docs-kit/blob/main/src/lib/components/EmbeddedExampleV2.svelte"
                filename="EmbeddedExampleV2.svelte"
            >
                <div class="embedded-demo">
                    <span>reset me</span>
                </div>
            </EmbeddedExampleV2>
        </section>

        <section class="inline-panel">
            <div class="lede">
                <p class="eyebrow">prose enhancer</p>
                <h2>raw code block.</h2>
                <p>The injected square copy button uses the imperative Motion APIs.</p>
            </div>
            <div class="prose-v2 prose-card" use:enhanceCodeBlocks>
                <div class="shiki-container" data-lang="ts">
                    <pre class="shiki"><code class="language-ts">{codeSample}</code></pre>
                </div>
            </div>
        </section>
    </main>
</div>

<style>
    :global(html) {
        background: #06090a;
        color-scheme: dark;
    }

    .harness {
        min-height: 100vh;
        padding: 42px 0 72px;
        --border: var(--brut-rule);
        --background: var(--brut-bg);
        --foreground: var(--brut-ink);
        --card: var(--brut-bg-2);
        --muted: var(--brut-bg-2);
        --muted-foreground: var(--brut-ink-2);
        --accent: var(--brut-accent);
    }

    .intro,
    .inline-panel {
        max-width: 1120px;
        margin: 0 auto;
        padding: 28px 24px;
        border-bottom: 1px solid var(--brut-rule);
    }

    .intro h1,
    .inline-panel h2 {
        margin: 8px 0 0;
        font-size: clamp(32px, 6vw, 62px);
        line-height: 0.96;
        letter-spacing: 0;
        text-transform: lowercase;
        font-weight: 600;
    }

    .inline-panel h2 {
        font-size: clamp(26px, 4vw, 42px);
    }

    .intro p,
    .lede p {
        max-width: 680px;
        color: var(--brut-ink-2);
        line-height: 1.6;
        margin: 12px 0 0;
    }

    .eyebrow {
        margin: 0;
        color: var(--brut-accent);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 11px;
    }

    .demo-card {
        min-height: 260px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        background:
            linear-gradient(var(--brut-rule) 1px, transparent 1px),
            linear-gradient(90deg, var(--brut-rule) 1px, transparent 1px);
        background-size: 48px 48px;
    }

    .demo-card strong {
        font-size: clamp(28px, 5vw, 56px);
        letter-spacing: 0;
        text-transform: lowercase;
    }

    .demo-card p {
        max-width: 360px;
        margin: 0;
        color: var(--brut-ink-2);
        text-align: center;
        line-height: 1.5;
    }

    .chip {
        color: var(--brut-accent);
        border: 1px solid var(--brut-accent);
        padding: 6px 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 10px;
    }

    .inline-panel {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 24px;
        align-items: start;
    }

    .lede {
        padding-top: 8px;
    }

    .embedded-demo {
        min-height: 180px;
        display: grid;
        place-items: center;
        background:
            linear-gradient(var(--brut-rule) 1px, transparent 1px),
            linear-gradient(90deg, var(--brut-rule) 1px, transparent 1px);
        background-size: 36px 36px;
    }

    .embedded-demo span {
        border: 1px solid var(--brut-accent);
        color: var(--brut-accent);
        padding: 10px 14px;
    }

    .prose-card {
        margin: 24px 0;
    }

    .prose-card :global(pre) {
        margin: 0;
        padding: 18px;
        overflow: auto;
        color: var(--brut-ink);
        background: var(--brut-bg);
        font-family: inherit;
        line-height: 1.65;
    }

    @media (max-width: 820px) {
        .inline-panel {
            grid-template-columns: 1fr;
        }
    }
</style>
