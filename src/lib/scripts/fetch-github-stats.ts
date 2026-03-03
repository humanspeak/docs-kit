import fs from 'fs/promises'
import path from 'path'

export interface FetchGitHubStatsOptions {
    repo: string
    fallbackStars: number
    outputPath: string
}

export async function fetchGitHubStats(options: FetchGitHubStatsOptions) {
    const { repo, fallbackStars, outputPath } = options

    async function writeStats(stars: number, isFallback = false) {
        const stats = { stars, updatedAt: new Date().toISOString() }
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.writeFile(outputPath, JSON.stringify(stats, null, 2) + '\n')
        console.log(`Wrote github-stats.json: ${stats.stars} stars${isFallback ? ' (fallback)' : ''}`)
        return stats
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
        })

        if (!res.ok) {
            console.warn(`GitHub API returned ${res.status}, using fallback star count`)
            return writeStats(fallbackStars, true)
        }

        const data = await res.json()
        return writeStats(data.stargazers_count)
    } catch (err) {
        console.warn('Failed to fetch GitHub stats, using fallback:', err)
        return writeStats(fallbackStars, true)
    }
}
