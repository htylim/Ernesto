import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getApiKey,
  setApiKey,
} from "../../../src/common/managers/apiKeyManager.js";
import { clearCache } from "../../../src/common/cache/summariesCache.js";
import { clearAudioCache } from "../../../src/common/cache/speechifyCache.js";
import { clearPromptsCache } from "../../../src/common/cache/promptsCache.js";
import {
  getDomainThemesStructure,
  setDefaultColorTheme,
  setDomainColorTheme,
  DEFAULT_COLORS,
} from "../../../src/common/managers/colorThemeManager.js";

// Mock crypto utils
vi.mock("../../../src/common/crypto/cryptoUtils.js", () => ({
  generateEncryptionKey: vi.fn(() => Promise.resolve("mock-key")),
  encryptValue: vi.fn((value) => Promise.resolve(`encrypted-${value}`)),
  decryptValue: vi.fn((value) =>
    Promise.resolve(value.replace("encrypted-", ""))
  ),
}));

// Mock chrome.storage
const mockStorage = {
  local: {
    get: vi.fn((key) => {
      if (typeof key === "string") {
        return Promise.resolve({ [key]: {} });
      } else if (Array.isArray(key)) {
        const result = {};
        key.forEach((k) => (result[k] = {}));
        return Promise.resolve(result);
      }
      return Promise.resolve({});
    }),
    set: vi.fn((data) => Promise.resolve()),
    remove: vi.fn((keys) => Promise.resolve()),
  },
};

// Mock chrome.runtime
const mockRuntime = {
  id: "mock-extension-id",
};

global.chrome = {
  storage: mockStorage,
  runtime: mockRuntime,
};

describe("Options Page", () => {
  let document;

  beforeEach(() => {
    document = {
      querySelector: vi.fn(),
    };
    global.document = document;
    vi.clearAllMocks();
  });

  describe("API Key Management", () => {
    it("should load API key from storage and set input value", async () => {
      const mockApiKey = "test-api-key";
      mockStorage.local.get.mockImplementationOnce(() =>
        Promise.resolve({ encryptedApiKey: `encrypted-${mockApiKey}` })
      );

      const apiKey = await getApiKey();
      expect(apiKey).toBe(mockApiKey);
      expect(mockStorage.local.get).toHaveBeenCalledWith(["encryptedApiKey"]);
    });

    it("should save API key to storage", async () => {
      const mockApiKey = "new-api-key";
      await setApiKey(mockApiKey);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        encryptedApiKey: `encrypted-${mockApiKey}`,
      });
    });
  });

  describe("Cache Management", () => {
    beforeEach(() => {
      mockStorage.local.get.mockImplementation((key) => {
        if (typeof key === "string") {
          return Promise.resolve({ [key]: { "test-key": { size: 100 } } });
        } else if (Array.isArray(key)) {
          const result = {};
          key.forEach((k) => (result[k] = { "test-key": { size: 100 } }));
          return Promise.resolve(result);
        }
        return Promise.resolve({});
      });

      vi.mock("../../../src/common/cache/genericCache.js", () => ({
        default: class GenericCache {
          constructor({ cacheKey }) {
            this.cacheKey = cacheKey;
          }
          async _defaultKeyGenerator(key) {
            return `${this.cacheKey}_${key}`;
          }
          async clear() {
            const result = await chrome.storage.local.get(this.cacheKey);
            const index = result[this.cacheKey] || {};
            const storageKeys = Object.keys(index).map(
              (key) => `${this.cacheKey}_${key}`
            );
            await chrome.storage.local.remove([this.cacheKey, ...storageKeys]);
          }
        },
      }));
    });

    it("should clear summaries cache", async () => {
      await clearCache();
      expect(mockStorage.local.remove).toHaveBeenCalled();
    });

    it("should clear audio cache", async () => {
      await clearAudioCache();
      expect(mockStorage.local.remove).toHaveBeenCalled();
    });

    it("should clear prompts cache", async () => {
      await clearPromptsCache();
      expect(mockStorage.local.remove).toHaveBeenCalled();
    });
  });

  describe("Color Theme Management", () => {
    const mockDefaultTheme = {
      mainAccentColor: "#6200ee",
      hoverColor: "#3700b3",
      disabledColor: "#b388ff",
      summaryBgColor: "#f3e5f5",
    };

    const mockDomainTheme = {
      domain: "example.com",
      colors: mockDefaultTheme,
    };

    beforeEach(() => {
      mockStorage.local.get.mockImplementation((key) => {
        return Promise.resolve({
          domain_color_themes: {
            "example.com": { primary: "#000000" },
          },
        });
      });
    });

    it("should save default color theme", async () => {
      const theme = { primary: "#ffffff" };
      await setDefaultColorTheme(theme);
      expect(mockStorage.local.set).toHaveBeenCalledWith({
        domain_color_themes: {
          default: theme,
          domains: {},
        },
      });
    });

    it("should save domain color theme", async () => {
      const domain = "example.com";
      const theme = { primary: "#000000" };
      await setDomainColorTheme(domain, theme);
      expect(mockStorage.local.set).toHaveBeenCalledWith({
        domain_color_themes: {
          default: DEFAULT_COLORS,
          domains: {
            [domain]: theme,
          },
        },
      });
    });

    it("should get domain themes structure", async () => {
      const mockThemes = {
        default: mockDefaultTheme,
        domains: {
          "example.com": mockDefaultTheme,
        },
      };
      mockStorage.local.get.mockImplementationOnce(() =>
        Promise.resolve({ domain_color_themes: mockThemes })
      );

      const themes = await getDomainThemesStructure();
      expect(themes).toEqual(mockThemes);
    });
  });
});
