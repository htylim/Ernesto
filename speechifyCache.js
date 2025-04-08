// Cache module for storing audio files with TTL
import GenericCache from "./genericCache.js";

/**
 * Convert Blob to array of numbers
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<number[]>} - Array of numbers
 */
async function blobToArray(blob) {
  const buffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

/**
 * Convert array of numbers to Blob
 * @param {number[]} array - The array to convert
 * @returns {Promise<Blob>} - Audio blob
 */
async function arrayToBlob(array) {
  const uint8Array = new Uint8Array(array);
  return new Blob([uint8Array], { type: "audio/mpeg" });
}

// Create a cache instance for audio files
export const audioCache = new GenericCache({
  cacheKey: "speechifyCache",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: "speechify",
  serialize: async (blob) => {
    return await blobToArray(blob);
  },
  deserialize: async (array) => {
    return await arrayToBlob(array);
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
