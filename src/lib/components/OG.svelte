<script lang="ts">
    import type { DocsKitConfig } from '../config.js'

    const {
        type = 'og',
        url,
        config,
        title,
        description,
        features
    }: {
        type: 'og' | 'twitter'
        url: string
        config: DocsKitConfig
        title?: string
        description?: string
        features?: string[]
    } = $props()

    const dimensions = {
        og: { width: 1200, height: 630, name: 'OpenGraph Card' },
        twitter: { width: 1200, height: 600, name: 'Twitter Card' }
    }

    const activeDimensions = $derived(dimensions[type])

    const displayFeatures = $derived(features?.slice(0, 4) || config.defaultFeatures.slice(0, 4))
    const displayTitle = $derived(title || config.name)
    const displayDescription = $derived(description || config.description)

    const figureLabel = $derived(type === 'og' ? 'FIG-001 / SOCIAL' : 'FIG-002 / SOCIAL')
    const sheetLabel = $derived(type === 'og' ? 'SHEET 01 / 01' : 'SHEET 02 / 02')
    const titleSize = $derived(type === 'og' ? '86px' : '78px')
</script>

<div
    id="social-card"
    style="box-sizing: border-box; display: flex; position: relative; overflow: hidden; background-color: #06090a; color: #ededed; width: {activeDimensions.width}px; height: {activeDimensions.height}px; font-family: 'lato';"
>
    <div
        style="display: flex; position: absolute; top: 0; right: 0; width: 620px; height: 420px; background-image: radial-gradient(ellipse at top right, rgba(84, 219, 188, 0.16), rgba(84, 219, 188, 0) 62%);"
    ></div>
    <div
        style="display: flex; position: absolute; inset: 34px; border: 1px solid #2a332f;"
    ></div>

    <div style="display: flex; position: absolute; top: 26px; left: 26px; width: 16px; height: 16px; border-top: 2px solid #54dbbc; border-left: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; top: 26px; right: 26px; width: 16px; height: 16px; border-top: 2px solid #54dbbc; border-right: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; bottom: 26px; left: 26px; width: 16px; height: 16px; border-bottom: 2px solid #54dbbc; border-left: 2px solid #54dbbc;"></div>
    <div style="display: flex; position: absolute; right: 26px; bottom: 26px; width: 16px; height: 16px; border-right: 2px solid #54dbbc; border-bottom: 2px solid #54dbbc;"></div>

    <div
        style="box-sizing: border-box; display: flex; position: absolute; top: 34px; right: 34px; bottom: 34px; left: 34px; flex-direction: column; padding: 42px 50px;"
    >
        <div
            style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%;"
        >
            <div
                style="display: flex; align-items: center; gap: 10px; border: 1px solid #1c2422; background-color: #0d1110; padding: 8px 15px; color: #9aa39f; font-size: 13px; line-height: 1; font-weight: 800; text-transform: uppercase; white-space: nowrap; font-family: 'lato-extrabold';"
            >
                <span style="display: flex; width: 8px; height: 8px; background-color: #54dbbc;"></span>
                <span>{config.npmPackage}</span>
            </div>

            <div
                style="display: flex; flex-direction: column; align-items: flex-end; color: #5a635f; font-size: 11px; line-height: 1.8; font-weight: 800; text-align: right; text-transform: uppercase; font-family: 'lato-extrabold';"
            >
                <span>{figureLabel}</span>
                <span style="color: #ededed;">{sheetLabel}</span>
                <span>SPRING · 2026</span>
            </div>
        </div>

        <h1
            style="display: block; max-width: 820px; margin: auto 0 0; color: #ededed; font-size: {titleSize}; line-height: 0.88; font-weight: 800; letter-spacing: 0; text-transform: lowercase; font-family: 'lato-extrabold';"
        >
            {displayTitle.toLowerCase()}
        </h1>

        <p
            style="display: block; margin: 18px 0 26px; color: #9aa39f; font-size: 24px; line-height: 1.25; font-weight: 700; letter-spacing: 0; font-family: 'lato';"
        >
            {displayDescription}
        </p>

        <div
            style="display: flex; width: 100%; border: 1px solid #1c2422;"
        >
            {#each displayFeatures as feature, i}
                <div
                    style="box-sizing: border-box; display: flex; flex: 1; flex-direction: column; gap: 10px; min-width: 0; padding: 14px 16px; border-right: {i === displayFeatures.length - 1
                        ? '0'
                        : '1px solid #1c2422'};"
                >
                    <div
                        style="display: flex; align-items: center; justify-content: space-between; color: #5a635f; font-size: 11px; line-height: 1; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';"
                    >
                        <span>NO {String(i + 1).padStart(2, '0')}</span>
                        <span
                            style="display: flex; width: 10px; height: 10px; border: 1px solid {i % 2 === 0
                                ? '#54dbbc'
                                : '#5a635f'}; background-color: {i % 2 === 0
                                ? '#54dbbc'
                                : 'transparent'};"
                        ></span>
                    </div>
                    <div
                        style="color: #ededed; font-size: 17px; line-height: 1.2; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';"
                    >
                        {feature}
                    </div>
                </div>
            {/each}
        </div>

        <div
            style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 24px;"
        >
            <div
                style="display: flex; align-items: center; gap: 14px; border: 1px solid #1c2422; background-color: #0d1110; padding: 12px 18px;"
            >
                <img
                    src="{url}/humanspeak-dark.svg"
                    alt="Humanspeak"
                    style="width: 30px; height: 30px;"
                />
                <div
                    style="display: flex; flex-direction: column; color: #5a635f; line-height: 1.25;"
                >
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';"
                        >CREATED BY</span
                    >
                    <span
                        style="color: #ededed; font-size: 20px; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';"
                        >Humanspeak</span
                    >
                </div>
            </div>

            <div
                style="display: flex; align-items: center; gap: 12px; border: 1px solid #1c2422; background-color: #0d1110; padding: 12px 18px;"
            >
                <span style="display: flex; width: 26px; height: 26px; color: #54dbbc;">
                    <svg viewBox="0 0 107 128" width="26" height="31" fill="none">
                        <path
                            d="M94.157 22.819c-10.4-14.885-30.94-19.297-45.792-9.835L22.282 29.608A29.92 29.92 0 0 0 8.764 49.65a31.5 31.5 0 0 0 3.108 20.231 30 30 0 0 0-4.477 11.183 31.9 31.9 0 0 0 5.448 24.116c10.402 14.887 30.942 19.297 45.791 9.835l26.083-16.624A29.92 29.92 0 0 0 98.235 78.35a31.53 31.53 0 0 0-3.105-20.232 30 30 0 0 0 4.474-11.182 31.88 31.88 0 0 0-5.447-24.116"
                            fill="currentColor"
                        />
                        <path
                            d="M45.817 106.582a20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.503 18 18 0 0 1 .624-2.435l.49-1.498 1.337.981a33.6 33.6 0 0 0 10.203 5.098l.97.294-.09.968a5.85 5.85 0 0 0 1.052 3.878 6.24 6.24 0 0 0 6.695 2.485 5.8 5.8 0 0 0 1.603-.704L69.27 76.28a5.43 5.43 0 0 0 2.45-3.631 5.8 5.8 0 0 0-.987-4.371 6.24 6.24 0 0 0-6.698-2.487 5.7 5.7 0 0 0-1.6.704l-9.953 6.345a19 19 0 0 1-5.296 2.326 20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.502 18 18 0 0 1 8.13-12.052l26.081-16.623a19 19 0 0 1 5.3-2.329A20.72 20.72 0 0 1 83.42 29.66a19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-.624 2.435l-.49 1.498-1.337-.98a33.6 33.6 0 0 0-10.203-5.1l-.97-.294.09-.968a5.86 5.86 0 0 0-1.052-3.878 6.24 6.24 0 0 0-6.696-2.485 5.8 5.8 0 0 0-1.602.704L37.73 51.72a5.42 5.42 0 0 0-2.449 3.63 5.8 5.8 0 0 0 .986 4.372 6.24 6.24 0 0 0 6.698 2.486 5.8 5.8 0 0 0 1.602-.704l9.952-6.342a19 19 0 0 1 5.295-2.328 20.72 20.72 0 0 1 22.237 8.242 19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-8.13 12.053l-26.081 16.622a19 19 0 0 1-5.3 2.328"
                            fill="#06090a"
                        />
                    </svg>
                </span>
                <div style="display: flex; flex-direction: column; line-height: 1.25;">
                    <span style="color: #54dbbc; font-size: 10px; font-weight: 800; text-transform: uppercase; font-family: 'lato-extrabold';"
                        >BUILT FOR</span
                    >
                    <span
                        style="color: #ededed; font-size: 18px; font-weight: 800; letter-spacing: 0; font-family: 'lato-extrabold';"
                        >Svelte 5</span
                    >
                </div>
            </div>
        </div>
    </div>
</div>
