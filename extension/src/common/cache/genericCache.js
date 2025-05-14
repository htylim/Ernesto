/**
 * Generic cache implementation with TTL support
 * Uses Chrome's storage.local API
 */
class GenericCache {
  /**
   * Create a new cache instance
   * @param {Object} options - Cache configuration options
   * @param {string} options.cacheKey - Key used to store the cache index in storage
   * @param {number} options.ttlMs - Time-to-live in milliseconds
   * @param {Function} options.keyGenerator - Function to generate storage keys for items
   * @param {Function} options.serialize - Function to serialize data for storage
   * @param {Function} options.deserialize - Function to deserialize data from storage
   * @param {string} options.keyPrefix - Prefix for generated keys (default: 'cache')
   */
  constructor({
    cacheKey,
    ttlMs = 24 * 60 * 60 * 1000, // Default 24 hours
    keyGenerator = null,
    serialize = null,
    deserialize = null,
    keyPrefix = "cache",
  }) {
    this.cacheKey = cacheKey;
    this.ttlMs = ttlMs;
    this.keyPrefix = keyPrefix;
    this.keyGenerator = keyGenerator || this._defaultKeyGenerator;
    this.serialize = serialize || this._defaultSerialize;
    this.deserialize = deserialize || this._defaultDeserialize;
  }

  /**
   * Utility function to generate a hash from input
   * @param {string} input - Input to generate a hash from
   * @returns {Promise<string>} - Generated hash
   */
  static async generateHash(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex.slice(0, 8);
  }

  /**
   * Default key generator that creates a hash from the input
   * @param {string} input - Input to generate a key from
   * @returns {Promise<string>} - Generated key
   */
  async _defaultKeyGenerator(input) {
    const hash = await GenericCache.generateHash(input);
    return `${this.keyPrefix}_${hash}`;
  }

  /**
   * Default serializer that converts data to JSON string
   * @param {any} data - Data to serialize
   * @returns {Promise<string>} - Serialized data
   */
  async _defaultSerialize(data) {
    return JSON.stringify(data);
  }

  /**
   * Default deserializer that parses JSON string
   * @param {string} data - Serialized data
   * @returns {Promise<any>} - Deserialized data
   */
  async _defaultDeserialize(data) {
    return JSON.parse(data);
  }

  /**
   * Get an item from cache if it exists and is not expired
   * @param {string} key - The key to get the item for
   * @returns {Promise<any|null>} - The cached item or null if not found/expired
   */
  async get(key) {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};
      const metadata = index[key];

      if (!metadata) return null;

      // Check if cache is expired
      if (Date.now() - metadata.timestamp > this.ttlMs) {
        // Remove expired cache
        await this._removeItem(key);
        return null;
      }

      // Get the item data
      const storageKey = await this.keyGenerator(key);
      const itemResult = await chrome.storage.local.get(storageKey);
      const serializedData = itemResult[storageKey];

      if (!serializedData) return null;

      return await this.deserialize(serializedData);
    } catch (error) {
      console.error(`Error retrieving from cache:`, error);
      return null;
    }
  }

  /**
   * Store an item in cache with timestamp
   * @param {string} key - The key to cache the item for
   * @param {any} item - The item to cache
   * @returns {Promise<void>}
   */
  async set(key, item) {
    try {
      const serializedData = await this.serialize(item);
      const storageKey = await this.keyGenerator(key);

      // Update the index
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};

      // Calculate actual byte size
      const byteSize = new TextEncoder().encode(serializedData).length;

      index[key] = {
        timestamp: Date.now(),
        size: byteSize,
      };

      // Store both the index and the item data
      await Promise.all([
        chrome.storage.local.set({ [this.cacheKey]: index }),
        chrome.storage.local.set({ [storageKey]: serializedData }),
      ]);
    } catch (error) {
      console.error(`Error caching item:`, error);
    }
  }

  /**
   * Remove a specific item from cache
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async _removeItem(key) {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};

      if (index[key]) {
        const storageKey = await this.keyGenerator(key);
        delete index[key];

        await Promise.all([
          chrome.storage.local.remove(storageKey),
          chrome.storage.local.set({ [this.cacheKey]: index }),
        ]);
      }
    } catch (error) {
      console.error(`Error removing item from cache:`, error);
    }
  }

  /**
   * Clear all expired cache entries
   * @returns {Promise<void>}
   */
  async clearExpired() {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};
      const now = Date.now();

      const expiredKeys = Object.entries(index)
        .filter(([_, metadata]) => now - metadata.timestamp > this.ttlMs)
        .map(([key]) => key);

      if (expiredKeys.length > 0) {
        // Remove expired entries
        for (const key of expiredKeys) {
          await this._removeItem(key);
        }
      }
    } catch (error) {
      console.error(`Error clearing expired cache:`, error);
    }
  }

  /**
   * Clear the entire cache
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};

      // Get all storage keys to remove
      const storageKeys = await Promise.all(
        Object.keys(index).map((key) => this.keyGenerator(key))
      );

      // Remove both index and all items
      await chrome.storage.local.remove([this.cacheKey, ...storageKeys]);
    } catch (error) {
      console.error(`Error clearing cache:`, error);
    }
  }

  /**
   * Get the total size of the cache in bytes
   * @returns {Promise<number>} - Total size in bytes
   */
  async getCacheSize() {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const index = result[this.cacheKey] || {};

      return Object.values(index).reduce(
        (total, metadata) => total + (metadata.size || 0),
        0
      );
    } catch (error) {
      console.error(`Error getting cache size:`, error);
      return 0;
    }
  }
}

export default GenericCache;
