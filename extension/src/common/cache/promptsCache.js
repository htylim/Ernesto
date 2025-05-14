// Cache module for storing prompts and responses with TTL
import GenericCache from "./genericCache.js";

// Create a cache instance for prompts
export const promptsCache = new GenericCache({
  cacheKey: "promptsCache",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: "prompts",
});

/**
 * Get prompts history from cache if it exists and is not expired
 * @param {string} url - The URL to get the prompts for
 * @returns {Promise<Array|null>} - The cached prompts history or null if not found/expired
 */
export async function getCachedPrompts(url) {
  return await promptsCache.get(url);
}

/**
 * Store prompts history in cache with timestamp
 * @param {string} url - The URL to cache the prompts for
 * @param {Array} promptsHistory - Array of prompt and response objects
 * @returns {Promise<void>}
 */
export async function cachePrompts(url, promptsHistory) {
  await promptsCache.set(url, promptsHistory);
}

/**
 * Clear all expired cache entries
 * @returns {Promise<void>}
 */
export async function clearExpiredPromptsCache() {
  await promptsCache.clearExpired();
}

/**
 * Clear the entire prompts cache
 * @returns {Promise<void>}
 */
export async function clearPromptsCache() {
  await promptsCache.clear();
}
