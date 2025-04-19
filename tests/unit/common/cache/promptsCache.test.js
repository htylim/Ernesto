// No import for vi needed with globals: true

// 1. Define the mock instance structure using vi.fn() - MOVED INSIDE MOCK
// const mockGenericCacheInstance = {
//   get: vi.fn(),
//   set: vi.fn(),
//   clearExpired: vi.fn(),
//   clear: vi.fn(),
// };

// 2. Use vi.mock to mock GenericCache *before* any imports.
vi.mock(
  "../../../../src/common/cache/genericCache.js",
  async (importOriginal) => {
    // Import the original if needed, or define mock structure
    const actual = await importOriginal(); // Optional: if you need parts of the original
    const mockGenericCacheInstance = {
      get: vi.fn(),
      set: vi.fn(),
      clearExpired: vi.fn(),
      clear: vi.fn(),
    };
    return {
      // Mock the default export (the class)
      default: vi.fn().mockImplementation(() => {
        return mockGenericCacheInstance;
      }),
      // Export the mock instance itself so tests can import it
      __mockInstance: mockGenericCacheInstance,
    };
  }
);

// 3. Statically import the module to test AND the exported mock instance.
import {
  getCachedPrompts,
  cachePrompts,
  clearExpiredPromptsCache,
  clearPromptsCache,
  promptsCache,
} from "../../../../src/common/cache/promptsCache.js";
// Import the instance exported from the mock factory
import { __mockInstance as mockGenericCacheInstance } from "../../../../src/common/cache/genericCache.js";

describe("Prompts Cache Functions", () => {
  const testUrl = "http://example.com";
  const testPromptsHistory = [{ prompt: "p1", response: "r1" }];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  test("promptsCache instance should be the mock instance", () => {
    // Verify that the imported promptsCache is indeed our mock
    expect(promptsCache).toBe(mockGenericCacheInstance);
  });

  test("getCachedPrompts should call the mock instance's get method", async () => {
    mockGenericCacheInstance.get.mockResolvedValue(testPromptsHistory);
    const result = await getCachedPrompts(testUrl);
    expect(mockGenericCacheInstance.get).toHaveBeenCalledWith(testUrl);
    expect(result).toEqual(testPromptsHistory);
  });

  test("getCachedPrompts should return null if cache miss", async () => {
    mockGenericCacheInstance.get.mockResolvedValue(null);
    const result = await getCachedPrompts(testUrl);
    expect(mockGenericCacheInstance.get).toHaveBeenCalledWith(testUrl);
    expect(result).toBeNull();
  });

  test("cachePrompts should call the mock instance's set method", async () => {
    await cachePrompts(testUrl, testPromptsHistory);
    expect(mockGenericCacheInstance.set).toHaveBeenCalledWith(
      testUrl,
      testPromptsHistory
    );
  });

  test("clearExpiredPromptsCache should call the mock instance's clearExpired method", async () => {
    await clearExpiredPromptsCache();
    expect(mockGenericCacheInstance.clearExpired).toHaveBeenCalledTimes(1);
  });

  test("clearPromptsCache should call the mock instance's clear method", async () => {
    await clearPromptsCache();
    expect(mockGenericCacheInstance.clear).toHaveBeenCalledTimes(1);
  });
});
