import { jest } from "@jest/globals";

// 1. Define the mock instance structure
const mockGenericCacheInstance = {
  get: jest.fn(),
  set: jest.fn(),
  clearExpired: jest.fn(),
  clear: jest.fn(),
};

// 2. Use jest.unstable_mockModule to mock GenericCache *before* any imports
// This is crucial for ES Modules
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
  getCachedPrompts,
  cachePrompts,
  clearExpiredPromptsCache,
  clearPromptsCache,
  promptsCache,
} = await import("../../../../src/common/cache/promptsCache.js");

describe("Prompts Cache Functions", () => {
  const testUrl = "http://example.com";
  const testPromptsHistory = [{ prompt: "p1", response: "r1" }];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
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
