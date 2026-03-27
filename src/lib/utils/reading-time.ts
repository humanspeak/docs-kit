/**
 * Estimates reading time for a text string.
 *
 * @param text - The text content to measure.
 * @param wordsPerMinute - Average reading speed (default 200 wpm).
 * @returns Estimated reading time in minutes (minimum 1).
 */
export const estimateReadingTime = (text: string, wordsPerMinute = 200): number => {
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / wordsPerMinute))
}
