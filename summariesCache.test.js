/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import {
  getCachedSummary,
  cacheSummary,
  clearExpiredCache,
  clearCache,
} from "./summariesCache.js";

describe("summariesCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
    chrome.storage.local.remove.mockReset();
  });

  describe("getCachedSummary", () => {
    test("returns null when no cache exists", async () => {
      chrome.storage.local.get.mockResolvedValue({ summariesCache: {} });

      const result = await getCachedSummary("https://example.com");
      expect(result).toBeNull();
    });

    test("returns null when cache is expired", async () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      chrome.storage.local.get.mockResolvedValue({
        summariesCache: {
          "https://example.com": {
            summary: "test summary",
            timestamp: oldTimestamp,
          },
        },
      });

      const result = await getCachedSummary("https://example.com");
      expect(result).toBeNull();
    });

    test("returns summary when cache is valid", async () => {
      const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      chrome.storage.local.get.mockResolvedValue({
        summariesCache: {
          "https://example.com": {
            summary: "test summary",
            timestamp: recentTimestamp,
          },
        },
      });

      const result = await getCachedSummary("https://example.com");
      expect(result).toBe("test summary");
    });
  });

  describe("cacheSummary", () => {
    test("stores summary with timestamp", async () => {
      chrome.storage.local.get.mockResolvedValue({ summariesCache: {} });

      await cacheSummary("https://example.com", "test summary");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        summariesCache: {
          "https://example.com": {
            summary: "test summary",
            timestamp: expect.any(Number),
          },
        },
      });
    });
  });

  describe("clearExpiredCache", () => {
    test("removes expired entries", async () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000;

      chrome.storage.local.get.mockResolvedValue({
        summariesCache: {
          "https://old.com": {
            summary: "old summary",
            timestamp: oldTimestamp,
          },
          "https://recent.com": {
            summary: "recent summary",
            timestamp: recentTimestamp,
          },
        },
      });

      await clearExpiredCache();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        summariesCache: {
          "https://recent.com": {
            summary: "recent summary",
            timestamp: recentTimestamp,
          },
        },
      });
    });

    test("does nothing when no expired entries", async () => {
      const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000;

      chrome.storage.local.get.mockResolvedValue({
        summariesCache: {
          "https://recent.com": {
            summary: "recent summary",
            timestamp: recentTimestamp,
          },
        },
      });

      await clearExpiredCache();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe("clearCache", () => {
    test("removes entire cache", async () => {
      await clearCache();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        "summariesCache"
      );
    });
  });
});
