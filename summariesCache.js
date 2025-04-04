// Cache module for storing summaries with TTL
import GenericCache from "./genericCache.js";

// Create a cache instance for summaries
export const summariesCache = new GenericCache({
  cacheKey: "summariesCache",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: "summaries",
});

/**
 * Get a summary from cache if it exists and is not expired
 * @param {string} url - The URL to get the summary for
 * @returns {Promise<string|null>} - The cached summary or null if not found/expired
 */
export async function getCachedSummary(url) {
  return await summariesCache.get(url);
}

/**
 * Store a summary in cache with timestamp
 * @param {string} url - The URL to cache the summary for
 * @param {string} summary - The summary to cache
 * @returns {Promise<void>}
 */
export async function cacheSummary(url, summary) {
  await summariesCache.set(url, summary);
}

/**
 * Clear all expired cache entries
 * @returns {Promise<void>}
 */
export async function clearExpiredCache() {
  await summariesCache.clearExpired();
}

/**
 * Clear the entire summaries cache
 * @returns {Promise<void>}
 */
export async function clearCache() {
  await summariesCache.clear();
}
