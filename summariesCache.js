// Cache module for storing summaries with TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = "summariesCache";

/**
 * Get a summary from cache if it exists and is not expired
 * @param {string} url - The URL to get the summary for
 * @returns {Promise<string|null>} - The cached summary or null if not found/expired
 */
export async function getCachedSummary(url) {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    const cachedData = cache[url];

    if (!cachedData) return null;

    // Check if cache is expired
    if (Date.now() - cachedData.timestamp > CACHE_TTL_MS) {
      // Remove expired cache
      delete cache[url];
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
      return null;
    }

    return cachedData.summary;
  } catch (error) {
    console.error("Error retrieving from cache:", error);
    return null;
  }
}

/**
 * Store a summary in cache with timestamp
 * @param {string} url - The URL to cache the summary for
 * @param {string} summary - The summary to cache
 * @returns {Promise<void>}
 */
export async function cacheSummary(url, summary) {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};

    cache[url] = {
      summary,
      timestamp: Date.now(),
    };

    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch (error) {
    console.error("Error caching summary:", error);
  }
}

/**
 * Clear all expired cache entries
 * @returns {Promise<void>}
 */
export async function clearExpiredCache() {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    const now = Date.now();

    let hasChanges = false;

    Object.keys(cache).forEach((key) => {
      if (now - cache[key].timestamp > CACHE_TTL_MS) {
        delete cache[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
    }
  } catch (error) {
    console.error("Error clearing expired cache:", error);
  }
}

/**
 * Clear the entire summaries cache
 * @returns {Promise<void>}
 */
export async function clearCache() {
  try {
    await chrome.storage.local.remove(CACHE_KEY);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}
