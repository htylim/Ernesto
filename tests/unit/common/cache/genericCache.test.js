import GenericCache from "../../../../src/common/cache/genericCache";
import { jest } from "@jest/globals";

// Mock chrome.storage.local
const mockStorage = (() => {
  let store = {};
  return {
    get: jest.fn(async (keys) => {
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
    set: jest.fn(async (items) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: jest.fn(async (keys) => {
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        delete store[key];
      });
      return Promise.resolve();
    }),
    clear: jest.fn(async () => {
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

global.chrome = {
  storage: {
    local: mockStorage,
  },
};

// Mock crypto.subtle for hashing
global.crypto = {
  subtle: {
    digest: jest.fn().mockImplementation(async (algorithm, data) => {
      // Simple mock hash - just return the first 8 bytes as hex
      const buffer = new Uint8Array(data.buffer.slice(0, 8));
      return buffer.buffer;
    }),
  },
};

describe("GenericCache", () => {
  const cacheKey = "testCacheIndex";
  const ttlMs = 1000 * 60 * 60; // 1 hour
  let cache;

  beforeEach(() => {
    // Reset mocks and cache instance before each test
    mockStorage._clearStore();
    jest.clearAllMocks();
    cache = new GenericCache({ cacheKey, ttlMs });
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

    // Verify storage calls
    const expectedStorageKey = `cache_${await GenericCache.generateHash(key)}`;
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
    expect(index[key].timestamp).toBeCloseTo(Date.now(), -2); // Allow for slight timing difference
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
    const key = "expiredKey";
    const item = { data: "expiredValue" };
    const shortTtl = 50; // 50 ms TTL
    const shortTtlCache = new GenericCache({ cacheKey, ttlMs: shortTtl });

    await shortTtlCache.set(key, item);
    const expectedStorageKey = `cache_${await GenericCache.generateHash(key)}`;

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, shortTtl + 10));

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
  });

  it("should clear expired items", async () => {
    const key1 = "key1";
    const item1 = { data: "value1" };
    const key2 = "key2";
    const item2 = { data: "value2" };
    const shortTtl = 50;
    const shortTtlCache = new GenericCache({ cacheKey, ttlMs: shortTtl });

    await shortTtlCache.set(key1, item1); // This will expire

    // Wait half TTL and set another item
    await new Promise((resolve) => setTimeout(resolve, shortTtl / 2));
    await cache.set(key2, item2); // This should not expire (uses default TTL)

    // Wait for the first item's TTL to fully expire
    await new Promise((resolve) => setTimeout(resolve, shortTtl / 2 + 10));

    await shortTtlCache.clearExpired(); // Use the cache instance with short TTL to trigger clearing

    // Verify key1 (expired) is removed
    const key1StorageKey = `cache_${await GenericCache.generateHash(key1)}`;
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(key1StorageKey);

    // Verify key2 (not expired by shortTtlCache's TTL check) still exists in index managed by shortTtlCache
    // Note: clearExpired uses the TTL of the instance it's called on.
    // We set key2 with the default cache, but check expiry with shortTtlCache
    // Since key2's timestamp is recent, it won't be cleared by shortTtlCache.clearExpired()
    const store = mockStorage._getStore();
    expect(store[cacheKey][key1]).toBeUndefined(); // Removed from index by clearExpired
    // Key2 remains because its timestamp > (now - shortTtl)
    // expect(store[cacheKey][key2]).toBeDefined(); // This check is complicated because separate caches share the index

    // Let's re-get key1 to confirm it's gone
    const retrievedItem1 = await shortTtlCache.get(key1);
    expect(retrievedItem1).toBeNull();

    // Let's get key2 using the original cache to confirm it's still valid
    const retrievedItem2 = await cache.get(key2);
    expect(retrievedItem2).toEqual(item2);
  });

  it("should clear the entire cache", async () => {
    const key1 = "clearKey1";
    const item1 = { data: "clearVal1" };
    const key2 = "clearKey2";
    const item2 = { data: "clearVal2" };

    await cache.set(key1, item1);
    await cache.set(key2, item2);

    const key1StorageKey = `cache_${await GenericCache.generateHash(key1)}`;
    const key2StorageKey = `cache_${await GenericCache.generateHash(key2)}`;

    // Ensure items are set
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
    const customKeyGen = jest.fn(async (key) => `custom_${key}`);
    const customSerialize = jest.fn(
      async (data) => `serialized:${JSON.stringify(data)}`
    );
    const customDeserialize = jest.fn(async (data) =>
      JSON.parse(data.substring("serialized:".length))
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
