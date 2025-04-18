import { jest } from "@jest/globals";

// 1. Define the mock instance structure
const mockGenericCacheInstance = {
  get: jest.fn(),
  set: jest.fn(),
  clearExpired: jest.fn(),
  clear: jest.fn(),
};

// 2. Use jest.unstable_mockModule to mock GenericCache *before* any imports
jest.unstable_mockModule(
  "../../../../src/common/cache/genericCache.js",
  () => ({
    // Mock the default export (the class)
    default: jest.fn().mockImplementation(() => {
      // The constructor returns our mock instance
      return mockGenericCacheInstance;
    }),
  })
);

// 3. Dynamically import the module to test AFTER the mock is set up
const {
  getCachedSummary,
  cacheSummary,
  clearExpiredCache,
  clearCache,
  summariesCache,
} = await import("../../../../src/common/cache/summariesCache.js");

describe("Summaries Cache Functions", () => {
  const testUrl = "http://example.com/summary";
  const testSummary = "This is a test summary.";

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
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
