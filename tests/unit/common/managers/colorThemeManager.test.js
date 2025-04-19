// Use Vitest globals
import { vi } from "vitest";

// --- Mocking Setup (using vi) ---

// Mock storage backend
const mockStorageStore = {};
const mockStorage = {
  get: vi.fn((keys, callback) => {
    const result = {};
    if (!keys) {
      // Simulate returning all items if keys is null/undefined
      Object.assign(result, mockStorageStore);
    } else {
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        if (mockStorageStore.hasOwnProperty(key)) {
          result[key] = mockStorageStore[key];
        }
      });
    }
    // Chrome storage API uses callbacks, not Promises directly in v2/v3 style tests
    // Let's simulate that, although the code uses Promises internally
    if (typeof callback === "function") {
      callback(result);
    }
    // Also return a promise for the internal async/await usage in the module
    return Promise.resolve(result);
  }),
  set: vi.fn((items, callback) => {
    Object.assign(mockStorageStore, items);
    if (typeof callback === "function") {
      callback();
    }
    return Promise.resolve();
  }),
  remove: vi.fn((keys, callback) => {
    const keyList = typeof keys === "string" ? [keys] : keys;
    keyList.forEach((key) => {
      delete mockStorageStore[key];
    });
    if (typeof callback === "function") {
      callback();
    }
    return Promise.resolve();
  }),
  clear: vi.fn((callback) => {
    Object.keys(mockStorageStore).forEach(
      (key) => delete mockStorageStore[key]
    );
    if (typeof callback === "function") {
      callback();
    }
    return Promise.resolve();
  }),
  // Helper for tests
  _clearStore: () => {
    Object.keys(mockStorageStore).forEach(
      (key) => delete mockStorageStore[key]
    );
  },
  _getStore: () => mockStorageStore,
};

// Mock the global chrome object
global.chrome = {
  storage: {
    local: mockStorage,
  },
  // Add other chrome APIs if needed
};

// --- Constants needed for tests (as they are not exported from the module) ---
const DOMAIN_COLORS_STORAGE_KEY = "domain_color_themes";

// --- Static Import of Module Under Test ---
// Import AFTER mocks are defined globally
import {
  DEFAULT_COLORS,
  getDomainThemesStructure,
  getColorTheme,
  getDefaultColorTheme,
  setDefaultColorTheme,
  setDomainColorTheme,
  removeDomainColorTheme,
  resetDefaultColorTheme,
  applyColorTheme,
} from "../../../../src/common/managers/colorThemeManager.js";

describe("colorThemeManager", () => {
  beforeEach(() => {
    // Reset mocks and storage before each test
    mockStorage._clearStore();
    vi.clearAllMocks(); // Use vi
    // vi.restoreAllMocks(); // Only needed if using vi.spyOn
  });

  it("should initialize with default structure if storage is empty", async () => {
    const themes = await getDomainThemesStructure();
    expect(themes).toEqual({
      default: DEFAULT_COLORS,
      domains: {},
    });
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    // Should not save automatically on initialization
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("should retrieve existing structure from storage", async () => {
    const existingStructure = {
      default: { mainAccentColor: "#ff0000" },
      domains: { "example.com": { mainAccentColor: "#00ff00" } },
    };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = existingStructure;

    const themes = await getDomainThemesStructure();
    expect(themes).toEqual(existingStructure);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
  });

  it("should get the default theme if domain is not specified", async () => {
    const theme = await getColorTheme();
    expect(theme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
  });

  it("should get the default theme if domain has no specific theme", async () => {
    const theme = await getColorTheme("unknown.com");
    expect(theme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
  });

  it("should get a domain-specific theme", async () => {
    const domain = "example.com";
    const domainTheme = { mainAccentColor: "#aabbcc" };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: DEFAULT_COLORS,
      domains: { [domain]: domainTheme },
    };

    const theme = await getColorTheme(domain);
    expect(theme).toEqual(domainTheme);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
  });

  it("should get the current default theme directly", async () => {
    const customDefault = { mainAccentColor: "#112233" };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: customDefault,
      domains: {},
    };
    const theme = await getDefaultColorTheme();
    expect(theme).toEqual(customDefault);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
  });

  it("should set the default theme", async () => {
    const newDefault = { mainAccentColor: "#abcdef" };
    await setDefaultColorTheme(newDefault);

    // Check if get was called first
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    // Check if set was called with the correct structure
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      {
        [DOMAIN_COLORS_STORAGE_KEY]: {
          default: newDefault,
          domains: {}, // Initially empty
        },
      },
      expect.any(Function)
    );

    // Verify the change in the mock store
    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.default).toEqual(newDefault);
  });

  it("should set a domain-specific theme", async () => {
    const domain = "test.org";
    const domainTheme = { hoverColor: "#123456" };
    await setDomainColorTheme(domain, domainTheme);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      {
        [DOMAIN_COLORS_STORAGE_KEY]: {
          default: DEFAULT_COLORS, // Starts with default
          domains: { [domain]: domainTheme },
        },
      },
      expect.any(Function)
    );

    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.domains[domain]).toEqual(domainTheme);
  });

  it("should throw error if setting domain theme with empty domain", async () => {
    const domainTheme = { hoverColor: "#123456" };
    await expect(setDomainColorTheme("", domainTheme)).rejects.toThrow(
      "Domain cannot be empty"
    );
    await expect(setDomainColorTheme(null, domainTheme)).rejects.toThrow(
      "Domain cannot be empty"
    );
    await expect(setDomainColorTheme(undefined, domainTheme)).rejects.toThrow(
      "Domain cannot be empty"
    );
  });

  it("should remove a domain-specific theme", async () => {
    const domain = "remove.me";
    const domainTheme = { summaryBgColor: "#ffffff" };
    const initialStructure = {
      default: DEFAULT_COLORS,
      domains: { [domain]: domainTheme },
    };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = initialStructure;

    await removeDomainColorTheme(domain);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      {
        [DOMAIN_COLORS_STORAGE_KEY]: {
          default: DEFAULT_COLORS,
          domains: {}, // Domain removed
        },
      },
      expect.any(Function)
    );

    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.domains[domain]).toBeUndefined();
  });

  it("should not fail and not call set if removing a non-existent domain theme", async () => {
    const domain = "not.here";
    const initialStructure = {
      default: DEFAULT_COLORS,
      domains: { other: {} },
    };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = initialStructure;

    await removeDomainColorTheme(domain);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    // Should not have called set because nothing changed
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes).toEqual(initialStructure); // Unchanged
  });

  it("should throw error if removing domain theme with empty domain", async () => {
    await expect(removeDomainColorTheme("")).rejects.toThrow(
      "Domain cannot be empty"
    );
    await expect(removeDomainColorTheme(null)).rejects.toThrow(
      "Domain cannot be empty"
    );
    await expect(removeDomainColorTheme(undefined)).rejects.toThrow(
      "Domain cannot be empty"
    );
  });

  it("should reset the default theme to hardcoded values", async () => {
    const customDefault = { mainAccentColor: "#ffddaa" };
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: customDefault,
      domains: {},
    };

    const resetTheme = await resetDefaultColorTheme();

    expect(resetTheme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY,
      expect.any(Function)
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      {
        [DOMAIN_COLORS_STORAGE_KEY]: {
          default: DEFAULT_COLORS,
          domains: {},
        },
      },
      expect.any(Function)
    );
    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.default).toEqual(DEFAULT_COLORS);
  });

  it("should apply color theme to document root", () => {
    // --- Local document mock using spyOn ---
    const mockSetProperty = vi.fn();
    const spy = vi
      .spyOn(document, "documentElement", "get")
      .mockImplementation(() => ({
        style: {
          setProperty: mockSetProperty,
        },
      }));
    // -------------------------------------

    const theme = {
      mainAccentColor: "#111",
      hoverColor: "#222",
      disabledColor: "#333",
      summaryBgColor: "#444",
    };
    applyColorTheme(theme);

    expect(mockSetProperty).toHaveBeenCalledTimes(4);
    expect(mockSetProperty).toHaveBeenCalledWith("--main-accent-color", "#111");
    expect(mockSetProperty).toHaveBeenCalledWith("--hover-color", "#222");
    expect(mockSetProperty).toHaveBeenCalledWith("--disabled-color", "#333");
    expect(mockSetProperty).toHaveBeenCalledWith("--summary-bg-color", "#444");

    spy.mockRestore(); // Clean up the spy
  });

  it("should apply default colors if theme object is invalid or missing values", () => {
    // --- Local document mock using spyOn ---
    const mockSetProperty = vi.fn();
    const spy = vi
      .spyOn(document, "documentElement", "get")
      .mockImplementation(() => ({
        style: {
          setProperty: mockSetProperty,
        },
      }));
    // -------------------------------------

    // First call: invalid theme
    applyColorTheme(null);
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--main-accent-color",
      DEFAULT_COLORS.mainAccentColor
    );
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--hover-color",
      DEFAULT_COLORS.hoverColor
    );
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--disabled-color",
      DEFAULT_COLORS.disabledColor
    );
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--summary-bg-color",
      DEFAULT_COLORS.summaryBgColor
    );

    // Reset mock calls *before* the second assertion
    mockSetProperty.mockClear();

    // Second call: missing values
    applyColorTheme({ mainAccentColor: "#555" });
    expect(mockSetProperty).toHaveBeenCalledWith("--main-accent-color", "#555"); // Provided value used
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--hover-color",
      DEFAULT_COLORS.hoverColor
    ); // Default fallback
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--disabled-color",
      DEFAULT_COLORS.disabledColor
    ); // Default fallback
    expect(mockSetProperty).toHaveBeenCalledWith(
      "--summary-bg-color",
      DEFAULT_COLORS.summaryBgColor
    ); // Default fallback

    spy.mockRestore(); // Clean up the spy
  });
});
