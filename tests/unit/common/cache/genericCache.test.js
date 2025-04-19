import GenericCache from "../../../../src/common/cache/genericCache.js";
import { vi } from "vitest";
// No import for vi needed with globals: true

// Mock chrome.storage.local using vi.fn()
const mockStorage = (() => {
  let store = {};
  return {
    get: vi.fn(async (keys) => {
      const result = {};
      if (keys === null || keys === undefined) {
        // chrome.storage.local.get() with no args or null/undefined returns all items
        return Promise.resolve({ ...store });
      }
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        if (store.hasOwnProperty(key)) {
          // Use hasOwnProperty for safety
          result[key] = store[key];
        }
      });
      return Promise.resolve(result);
    }),
    set: vi.fn(async (items) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: vi.fn(async (keys) => {
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        delete store[key];
      });
      return Promise.resolve();
    }),
    clear: vi.fn(async () => {
      store = {};
      return Promise.resolve();
    }),
    // Helper to reset the mock store for tests
    _clearStore: () => {
      store = {};
    },
    // Helper to inspect the store
    _getStore: () => store,
  };
})();

// This global setup might be better in vitest.setup.js, but keep here for now
global.chrome = {
  storage: {
    local: mockStorage,
  },
};

// We don't need to mock global crypto.subtle here anymore,
// as we will mock GenericCache.generateHash directly.
// // global.crypto = {
// //   subtle: {
// //     digest: vi.fn() /* ... */
// //   },
// // };

describe("GenericCache", () => {
  const cacheKey = "testCacheIndex";
  const ttlMs = 1000 * 60 * 60; // 1 hour
  let cache;

  // Define predictable hash values for keys used in tests
  const predictableHashes = {
    testKey1: "hashed_testKey1",
    expiredKey: "hashed_expiredKey",
    key1: "hashed_key1",
    clearKey1: "hashed_clearKey1",
    clearKey2: "hashed_clearKey2",
    sizeKey1: "hashed_sizeKey1",
    sizeKey2: "hashed_sizeKey2",
  };

  beforeEach(() => {
    // Reset mocks and cache instance before each test
    mockStorage._clearStore();
    vi.clearAllMocks(); // Use vi
    cache = new GenericCache({ cacheKey, ttlMs });

    // Mock the static generateHash method for predictability
    vi.spyOn(GenericCache, "generateHash").mockImplementation(async (key) => {
      return predictableHashes[key] || `hashed_${key.substring(0, 10)}`;
    });
  });

  afterEach(() => {
    // Restore the original implementation
    vi.restoreAllMocks();
  });

  it("should initialize with default options", () => {
    const defaultCache = new GenericCache({ cacheKey: "defaultTest" });
    expect(defaultCache.cacheKey).toBe("defaultTest");
    expect(defaultCache.ttlMs).toBe(24 * 60 * 60 * 1000); // Default TTL
    expect(defaultCache.keyPrefix).toBe("cache");
    expect(typeof defaultCache.keyGenerator).toBe("function");
    expect(typeof defaultCache.serialize).toBe("function");
    expect(typeof defaultCache.deserialize).toBe("function");
  });

  it("should set and get an item", async () => {
    const key = "testKey1";
    const item = { data: "testValue" };

    await cache.set(key, item);

    // Verify storage calls using the predictable hash
    const expectedStorageKey = `cache_${predictableHashes[key]}`;

    expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [expectedStorageKey]: JSON.stringify(item),
    });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ [cacheKey]: expect.any(Object) })
    );

    // Verify index structure
    const store = mockStorage._getStore();
    const index = store[cacheKey];
    expect(index[key]).toBeDefined();
    // Use Vitest's expect.closeTo or similar for time comparison if needed
    expect(index[key].timestamp).toBeGreaterThanOrEqual(Date.now() - 1000); // Looser check
    expect(index[key].timestamp).toBeLessThanOrEqual(Date.now() + 100); // Looser check
    expect(index[key].size).toBe(JSON.stringify(item).length);

    const retrievedItem = await cache.get(key);
    expect(retrievedItem).toEqual(item);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(cacheKey); // Called once during set, once during get
    expect(chrome.storage.local.get).toHaveBeenCalledWith(expectedStorageKey);
  });

  it("should return null for a non-existent key", async () => {
    const key = "nonExistentKey";
    const retrievedItem = await cache.get(key);
    expect(retrievedItem).toBeNull();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(cacheKey);
    // Should not attempt to get item data if index doesn't exist
    expect(chrome.storage.local.get).not.toHaveBeenCalledWith(
      expect.stringContaining(`cache_`)
    );
  });

  it("should return null and remove item for an expired key", async () => {
    vi.useFakeTimers(); // Use fake timers for this test
    const key = "expiredKey";
    const item = { data: "expiredValue" };
    const shortTtl = 50; // 50 ms TTL
    const shortTtlCache = new GenericCache({ cacheKey, ttlMs: shortTtl });

    await shortTtlCache.set(key, item);
    // Use predictable hash
    const expectedStorageKey = `cache_${predictableHashes[key]}`;

    // Wait for TTL to expire using fake timers
    vi.advanceTimersByTime(shortTtl + 10);

    const retrievedItem = await shortTtlCache.get(key);
    expect(retrievedItem).toBeNull();

    // Verify item and index entry were removed
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
      expectedStorageKey
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ [cacheKey]: {} }); // Index updated

    // Verify item is gone from storage
    const store = mockStorage._getStore();
    expect(store[expectedStorageKey]).toBeUndefined();
    expect(store[cacheKey][key]).toBeUndefined();

    vi.useRealTimers(); // Restore real timers
  });

  it("should clear expired items", async () => {
    vi.useFakeTimers();
    const key1 = "key1";
    const item1 = { data: "value1" };
    const key2 = "key2";
    const item2 = { data: "value2" };
    const shortTtl = 50;
    const shortTtlCache = new GenericCache({ cacheKey, ttlMs: shortTtl });
    // Use a separate instance with default TTL for the second item
    const defaultTtlCache = new GenericCache({ cacheKey, ttlMs });

    await shortTtlCache.set(key1, item1); // This will expire based on shortTtlCache check

    // Wait half TTL and set another item using default cache
    vi.advanceTimersByTime(shortTtl / 2);
    await defaultTtlCache.set(key2, item2); // This uses the default long TTL

    // Wait for the first item's TTL to fully expire
    vi.advanceTimersByTime(shortTtl / 2 + 10);

    await shortTtlCache.clearExpired(); // Use the cache instance with short TTL to trigger clearing

    // Verify key1 (expired) is removed - use predictable hash
    const key1StorageKey = `cache_${predictableHashes[key1]}`;
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(key1StorageKey);

    // Verify key2 still exists in index (it wasn't expired according to shortTtlCache's check)
    const store = mockStorage._getStore();
    expect(store[cacheKey][key1]).toBeUndefined(); // Removed from index by clearExpired
    expect(store[cacheKey][key2]).toBeDefined(); // key2 should still be in the index

    // Let's re-get key1 using shortTtlCache to confirm it's gone
    const retrievedItem1 = await shortTtlCache.get(key1);
    expect(retrievedItem1).toBeNull();

    // Let's get key2 using the default TTL cache to confirm it's still valid
    const retrievedItem2 = await defaultTtlCache.get(key2);
    expect(retrievedItem2).toEqual(item2);
    vi.useRealTimers();
  });

  it("should clear the entire cache", async () => {
    const key1 = "clearKey1";
    const item1 = { data: "clearVal1" };
    const key2 = "clearKey2";
    const item2 = { data: "clearVal2" };

    await cache.set(key1, item1);
    await cache.set(key2, item2);

    const key1StorageKey = `cache_${predictableHashes[key1]}`;
    const key2StorageKey = `cache_${predictableHashes[key2]}`;

    // Ensure items are set (using correct keys)
    let store = mockStorage._getStore();
    expect(store[cacheKey]).toBeDefined();
    expect(store[key1StorageKey]).toBeDefined();
    expect(store[key2StorageKey]).toBeDefined();

    await cache.clear();

    // Verify index and items are removed
    expect(chrome.storage.local.remove).toHaveBeenCalledWith([
      cacheKey,
      key1StorageKey,
      key2StorageKey,
    ]);
    store = mockStorage._getStore();
    expect(store[cacheKey]).toBeUndefined();
    expect(store[key1StorageKey]).toBeUndefined();
    expect(store[key2StorageKey]).toBeUndefined();
  });

  it("should calculate the cache size", async () => {
    const key1 = "sizeKey1";
    const item1 = { data: "sizeValue1" }; // Approx 24 bytes stringified
    const key2 = "sizeKey2";
    const item2 = { data: "sizeValue2", extra: "more data" }; // Approx 48 bytes

    await cache.set(key1, item1);
    await cache.set(key2, item2);

    const size = await cache.getCacheSize();

    const expectedSize =
      JSON.stringify(item1).length + JSON.stringify(item2).length;
    expect(size).toBe(expectedSize);

    // Test size after clearing one item
    await cache._removeItem(key1); // Use internal method for simplicity here
    const sizeAfterRemove = await cache.getCacheSize();
    expect(sizeAfterRemove).toBe(JSON.stringify(item2).length);
  });

  it("should use custom keyGenerator, serialize, and deserialize", async () => {
    const customKeyGen = vi.fn(async (key) => `custom_${key}`); // Use vi.fn
    const customSerialize = vi.fn(
      // Use vi.fn
      async (data) => `serialized:${JSON.stringify(data)}`
    );
    const customDeserialize = vi.fn(
      async (
        data // Use vi.fn
      ) => JSON.parse(data.substring("serialized:".length))
    );

    const customCache = new GenericCache({
      cacheKey: "customCacheIndex",
      ttlMs,
      keyGenerator: customKeyGen,
      serialize: customSerialize,
      deserialize: customDeserialize,
    });

    const key = "customKey";
    const item = { value: 123 };

    await customCache.set(key, item);

    // Verify custom functions were called
    expect(customSerialize).toHaveBeenCalledWith(item);
    expect(customKeyGen).toHaveBeenCalledWith(key); // Called during set

    // Verify storage used custom key and serialized data
    const expectedStorageKey = "custom_customKey";
    const expectedSerializedData = `serialized:${JSON.stringify(item)}`;
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [expectedStorageKey]: expectedSerializedData,
    });

    // Verify get uses custom functions
    const retrievedItem = await customCache.get(key);
    expect(customKeyGen).toHaveBeenCalledWith(key); // Called again during get
    expect(customDeserialize).toHaveBeenCalledWith(expectedSerializedData);
    expect(retrievedItem).toEqual(item);
  });
});
