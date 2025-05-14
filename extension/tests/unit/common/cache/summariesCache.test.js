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
  getCachedSummary,
  cacheSummary,
  clearExpiredCache,
  clearCache,
  summariesCache,
} from "../../../../src/common/cache/summariesCache.js";
// Import the instance exported from the mock factory
import { __mockInstance as mockGenericCacheInstance } from "../../../../src/common/cache/genericCache.js";

describe("Summaries Cache Functions", () => {
  const testUrl = "http://example.com/summary";
  const testSummary = "This is a test summary.";

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  test("summariesCache instance should be the mock instance", () => {
    // Verify that the imported summariesCache is indeed our mock
    expect(summariesCache).toBe(mockGenericCacheInstance);
  });

  test("getCachedSummary should call the mock instance's get method", async () => {
    mockGenericCacheInstance.get.mockResolvedValue(testSummary);
    const result = await getCachedSummary(testUrl);
    expect(mockGenericCacheInstance.get).toHaveBeenCalledWith(testUrl);
    expect(result).toEqual(testSummary);
  });

  test("getCachedSummary should return null if cache miss", async () => {
    mockGenericCacheInstance.get.mockResolvedValue(null);
    const result = await getCachedSummary(testUrl);
    expect(mockGenericCacheInstance.get).toHaveBeenCalledWith(testUrl);
    expect(result).toBeNull();
  });

  test("cacheSummary should call the mock instance's set method", async () => {
    await cacheSummary(testUrl, testSummary);
    expect(mockGenericCacheInstance.set).toHaveBeenCalledWith(
      testUrl,
      testSummary
    );
  });

  test("clearExpiredCache should call the mock instance's clearExpired method", async () => {
    await clearExpiredCache();
    expect(mockGenericCacheInstance.clearExpired).toHaveBeenCalledTimes(1);
  });

  test("clearCache should call the mock instance's clear method", async () => {
    await clearCache();
    expect(mockGenericCacheInstance.clear).toHaveBeenCalledTimes(1);
  });
});
