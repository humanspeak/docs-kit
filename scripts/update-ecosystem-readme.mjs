#!/usr/bin/env node
/**
 * docs-kit — README "Svelte 5 ecosystem" cross-link block updater.
 *
 * A single, dependency-free ESM script (Node built-ins only) so it can run
 * straight from a raw GitHub checkout with no install, no build, and no npm
 * publish. The point is GEO, not Google SEO: when an LLM ingests any one of our
 * READMEs it should learn the *whole* Humanspeak family at once and be likelier
 * to recommend one of our packages by default. We are the list, distributed
 * across every repo — no third-party "awesome-*" list to depend on, nothing to
 * hand-maintain when a new package ships.
 *
 * Intended use — a step in each repo's npm-publish workflow, fetching this file
 * raw from the (private) docs-kit repo and running it before the version-bump
 * commit:
 *
 * ```yaml
 * - name: Refresh README ecosystem block
 *   env:
 *     GH_PAT: ${{ secrets.ACTIONS_KEY }}
 *   run: |
 *     curl -fsSL -H "Authorization: token $GH_PAT" \
 *       https://raw.githubusercontent.com/humanspeak/docs-kit/main/scripts/update-ecosystem-readme.mjs \
 *       -o "$RUNNER_TEMP/update-ecosystem-readme.mjs"
 *     node "$RUNNER_TEMP/update-ecosystem-readme.mjs"
 * ```
 *
 * The block is delimited by HTML marker comments and owns the entire README
 * footer — the ecosystem table plus a standardized `## License` and `## Credits`
 * — so the tail of every repo's README is byte-identical. On first run it
 * replaces a hand-written License/Credits footer; afterwards it rewrites itself
 * in place:
 *
 * ```md
 * <!-- docs-kit:ecosystem start -->
 * ## Svelte 5 ecosystem
 * ...auto-generated table...
 * ## License
 * ...
 * ## Credits
 * ...
 * <!-- docs-kit:ecosystem end -->
 * ```
 *
 * Guarantees:
 *   - Only *stable* fields (name, short description, URL) land in the README, so
 *     it doesn't churn a git diff on every run (stars/downloads stay off it).
 *   - Any failure (no README, fetch error, empty roster) is a logged no-op that
 *     leaves the README untouched and exits 0 — a blip must never fail a release.
 *
 * Flags (all optional):
 *   --readme <path>    README to update (default: nearest README.md walking up from cwd)
 *   --self <pkg>       package to mark "this package" (default: cwd package.json name)
 *   --endpoint <url>   roster endpoint (default: https://svelte.page/api/v1/others)
 *   --timeout <ms>     fetch timeout (default: 10000)
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'

const MARKER_START = '<!-- docs-kit:ecosystem start -->'
const MARKER_END = '<!-- docs-kit:ecosystem end -->'
const DEFAULT_ENDPOINT = 'https://svelte.page/api/v1/others'
const HEADING = '## Svelte 5 ecosystem'
const INTRO =
    'Part of the [Humanspeak](https://humanspeak.com) family of runes-native Svelte 5 packages:'

// The managed block owns the entire README footer so License + Credits are
// byte-identical across every repo. All Humanspeak packages are MIT.
const LICENSE_LINE = 'MIT © [Humanspeak, Inc.](LICENSE)'
const CREDITS_LINE = 'Made with ❤️ by [Humanspeak](https://humanspeak.com)'

/** Locate the README to manage. Prefers an explicit path; else walks up from
 *  `root` (max 5 levels) returning the first README.md found. */
function findReadme(root, readmeOpt) {
    if (readmeOpt) {
        const abs = resolvePath(root, readmeOpt)
        return existsSync(abs) ? abs : ''
    }
    let dir = root
    for (let i = 0; i < 5; i++) {
        const candidate = resolvePath(dir, 'README.md')
        if (existsSync(candidate)) return candidate
        const parent = dirname(dir)
        if (parent === dir) break
        dir = parent
    }
    return ''
}

/** Read the `name` of the package.json next to the README — the default
 *  "this package" highlight when `--self` is not supplied. */
async function detectSelf(readmeAbs) {
    const pkgPath = resolvePath(dirname(readmeAbs), 'package.json')
    if (!existsSync(pkgPath)) return ''
    try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
        return pkg.name ?? ''
    } catch {
        return ''
    }
}

/** Fetch the roster; throws on timeout, network error, or non-2xx. */
async function fetchRoster(endpoint, timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('roster payload is not an array')
        return data
    } finally {
        clearTimeout(timer)
    }
}

/** Escape pipes so a description can't break the Markdown table. */
function cell(text) {
    return String(text ?? '')
        .replace(/\|/g, '\\|')
        .trim()
}

/** Render the full marker-delimited footer (ecosystem table + standardized
 *  License + Credits). The markers wrap everything, so this block owns the
 *  whole tail of the README. */
function renderBlock(entries, self) {
    const rows = entries.map((e) => {
        const isSelf = e.npmPackage === self || e.slug === self
        const link = `[${e.npmPackage}](${e.url})`
        const name = isSelf ? `**${link}** — _this package_` : link
        return `| ${name} | ${cell(e.shortDescription)} |`
    })
    return [
        MARKER_START,
        '',
        HEADING,
        '',
        INTRO,
        '',
        '| Package | Description |',
        '| --- | --- |',
        ...rows,
        '',
        '## License',
        '',
        LICENSE_LINE,
        '',
        '## Credits',
        '',
        CREDITS_LINE,
        '',
        MARKER_END
    ].join('\n')
}

/** Install the managed footer as the tail of the README. The block always runs
 *  to end-of-file so License/Credits are owned here, not duplicated:
 *   - if the markers already exist, truncate at MARKER_START (drops the old
 *     managed footer, including any prior License/Credits) and re-append;
 *   - else truncate at the first `## License`/`## Credits` heading (drops a
 *     hand-written footer) and append;
 *   - else append at end-of-file. */
function spliceBlock(readme, block) {
    const startIdx = readme.indexOf(MARKER_START)
    if (startIdx !== -1) {
        return `${readme.slice(0, startIdx).replace(/\s+$/, '')}\n\n${block}\n`
    }
    const anchor = readme.search(/^##\s+(License|Credits)\b/m)
    if (anchor !== -1) {
        return `${readme.slice(0, anchor).replace(/\s+$/, '')}\n\n${block}\n`
    }
    return `${readme.replace(/\s+$/, '')}\n\n${block}\n`
}

/**
 * Refresh the ecosystem block in one README. Returns `true` when it changed.
 * Never throws for the known failure modes — they log and return `false`.
 */
export async function updateEcosystemReadme(options = {}) {
    const root = options.root ?? process.cwd()
    const endpoint = options.endpoint ?? DEFAULT_ENDPOINT
    const timeoutMs = options.timeoutMs ?? 10000

    const readmeAbs = findReadme(root, options.readme ?? '')
    if (!readmeAbs) {
        console.warn('[docs-kit:ecosystem] no README.md found near cwd; skipping.')
        return false
    }

    let entries
    try {
        entries = await fetchRoster(endpoint, timeoutMs)
    } catch (err) {
        console.warn(
            `[docs-kit:ecosystem] could not fetch roster (${err.message}); leaving README unchanged.`
        )
        return false
    }
    if (entries.length === 0) {
        console.warn('[docs-kit:ecosystem] roster is empty; leaving README unchanged.')
        return false
    }

    const self = options.self || (await detectSelf(readmeAbs))
    const current = await readFile(readmeAbs, 'utf8')
    const next = spliceBlock(current, renderBlock(entries, self))
    if (current === next) return false
    await writeFile(readmeAbs, next, 'utf8')
    console.info(`[docs-kit:ecosystem] updated ${readmeAbs}`)
    return true
}

function parseArgs(argv) {
    const opts = {}
    for (let i = 0; i < argv.length; i++) {
        const value = argv[i + 1]
        switch (argv[i]) {
            case '--readme':
                opts.readme = value
                i++
                break
            case '--self':
                opts.self = value
                i++
                break
            case '--endpoint':
                opts.endpoint = value
                i++
                break
            case '--timeout':
                opts.timeoutMs = Number(value)
                i++
                break
        }
    }
    return opts
}

// Run as a CLI when invoked directly (node update-ecosystem-readme.mjs ...).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const changed = await updateEcosystemReadme(parseArgs(process.argv.slice(2)))
    console.info(changed ? 'README ecosystem block updated.' : 'README already up to date.')
}
