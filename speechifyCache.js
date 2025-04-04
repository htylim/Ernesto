// Cache module for storing audio files with TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_INDEX_KEY = "speechifyCache";

/**
 * Generate a hash key for a URL using SHA-256
 * @param {string} url - The URL to hash
 * @returns {Promise<string>} - The hashed key
 */
async function getAudioKey(url) {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `speechify_${hashHex.slice(0, 8)}`;
}

/**
 * Convert Blob to base64 string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - Base64 string
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 * @param {string} base64String - The base64 string to convert
 * @returns {Promise<Blob>} - Audio blob
 */
async function base64ToBlob(base64String) {
  const response = await fetch(base64String);
  return await response.blob();
}

/**
 * Get a cached audio file if it exists and is not expired
 * @param {string} url - The URL to get the audio for
 * @returns {Promise<Blob|null>} - The cached audio data or null if not found/expired
 */
export async function getCachedAudio(url) {
  try {
    const result = await chrome.storage.local.get(CACHE_INDEX_KEY);
    const index = result[CACHE_INDEX_KEY] || {};
    const audioKey = await getAudioKey(url);
    const metadata = index[url];

    if (!metadata) return null;

    // Check if cache is expired
    if (Date.now() - metadata.timestamp > CACHE_TTL_MS) {
      // Remove expired cache
      delete index[url];
      await chrome.storage.local.remove(audioKey);
      await chrome.storage.local.set({ [CACHE_INDEX_KEY]: index });
      return null;
    }

    // Get the audio data
    const audioResult = await chrome.storage.local.get(audioKey);
    const base64String = audioResult[audioKey];
    return base64String ? await base64ToBlob(base64String) : null;
  } catch (error) {
    console.error("Error retrieving from audio cache:", error);
    return null;
  }
}

/**
 * Store an audio file in cache with timestamp
 * @param {string} url - The URL to cache the audio for
 * @param {Blob} audioBlob - The audio blob to cache
 * @returns {Promise<void>}
 */
export async function cacheAudio(url, audioBlob) {
  try {
    const base64String = await blobToBase64(audioBlob);
    const audioKey = await getAudioKey(url);

    // Update the index
    const result = await chrome.storage.local.get(CACHE_INDEX_KEY);
    const index = result[CACHE_INDEX_KEY] || {};

    index[url] = {
      timestamp: Date.now(),
      size: audioBlob.size,
    };

    // Store both the index and the audio data
    await Promise.all([
      chrome.storage.local.set({ [CACHE_INDEX_KEY]: index }),
      chrome.storage.local.set({ [audioKey]: base64String }),
    ]);
  } catch (error) {
    console.error("Error caching audio:", error);
  }
}

/**
 * Clear all expired audio cache entries
 * @returns {Promise<void>}
 */
export async function clearExpiredAudioCache() {
  try {
    const result = await chrome.storage.local.get(CACHE_INDEX_KEY);
    const index = result[CACHE_INDEX_KEY] || {};
    const now = Date.now();

    const expiredUrls = Object.entries(index)
      .filter(([_, metadata]) => now - metadata.timestamp > CACHE_TTL_MS)
      .map(([url]) => url);

    if (expiredUrls.length > 0) {
      // Remove expired entries from index
      expiredUrls.forEach((url) => delete index[url]);

      // Remove expired audio files
      const audioKeys = expiredUrls.map(async (url) => await getAudioKey(url));
      const keys = await Promise.all(audioKeys);
      await chrome.storage.local.remove(keys);
      await chrome.storage.local.set({ [CACHE_INDEX_KEY]: index });
    }
  } catch (error) {
    console.error("Error clearing expired audio cache:", error);
  }
}

/**
 * Clear the entire audio cache
 * @returns {Promise<void>}
 */
export async function clearAudioCache() {
  try {
    const result = await chrome.storage.local.get(CACHE_INDEX_KEY);
    const index = result[CACHE_INDEX_KEY] || {};

    // Get all audio keys to remove
    const audioKeys = Object.keys(index).map(
      async (url) => await getAudioKey(url)
    );
    const keys = await Promise.all(audioKeys);

    // Remove both index and all audio files
    await chrome.storage.local.remove([CACHE_INDEX_KEY, ...keys]);
  } catch (error) {
    console.error("Error clearing audio cache:", error);
  }
}
