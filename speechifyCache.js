// Cache module for storing audio files with TTL
import GenericCache from "./genericCache.js";

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

// Create a cache instance for audio files
export const audioCache = new GenericCache({
  cacheKey: "speechifyCache",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: "speechify",
  serialize: async (blob) => {
    return await blobToBase64(blob);
  },
  deserialize: async (base64String) => {
    return await base64ToBlob(base64String);
  },
});

/**
 * Get a cached audio file if it exists and is not expired
 * @param {string} url - The URL to get the audio for
 * @returns {Promise<Blob|null>} - The cached audio data or null if not found/expired
 */
export async function getCachedAudio(url) {
  return await audioCache.get(url);
}

/**
 * Store an audio file in cache with timestamp
 * @param {string} url - The URL to cache the audio for
 * @param {Blob} audioBlob - The audio blob to cache
 * @returns {Promise<void>}
 */
export async function cacheAudio(url, audioBlob) {
  await audioCache.set(url, audioBlob);
}

/**
 * Clear all expired audio cache entries
 * @returns {Promise<void>}
 */
export async function clearExpiredAudioCache() {
  await audioCache.clearExpired();
}

/**
 * Clear the entire audio cache
 * @returns {Promise<void>}
 */
export async function clearAudioCache() {
  await audioCache.clear();
}
