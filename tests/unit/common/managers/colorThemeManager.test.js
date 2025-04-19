// Use Vitest globals
import { vi } from "vitest";

// --- Mocking Setup (using vi) ---

// Mock storage backend
const mockStorageStore = {};
const mockStorage = {
  get: vi.fn((keys) => {
    const result = {};
    if (!keys) {
      Object.assign(result, mockStorageStore);
    } else {
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        if (mockStorageStore.hasOwnProperty(key)) {
          result[key] = mockStorageStore[key];
        }
      });
    }
    return Promise.resolve(result);
  }),
  set: vi.fn((items) => {
    Object.assign(mockStorageStore, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys) => {
    const keyList = typeof keys === "string" ? [keys] : keys;
    keyList.forEach((key) => {
      delete mockStorageStore[key];
    });
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorageStore).forEach(
      (key) => delete mockStorageStore[key]
    );
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
      DOMAIN_COLORS_STORAGE_KEY
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
      DOMAIN_COLORS_STORAGE_KEY
    );
  });

  it("should get the default theme if domain is not specified", async () => {
    const theme = await getColorTheme();
    expect(theme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
  });

  it("should get the default theme if domain has no specific theme", async () => {
    const theme = await getColorTheme("unknown.com");
    expect(theme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
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
      DOMAIN_COLORS_STORAGE_KEY
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
      DOMAIN_COLORS_STORAGE_KEY
    );
  });

  it("should set the default theme", async () => {
    const newDefault = { mainAccentColor: "#abcdef" };
    await setDefaultColorTheme(newDefault);

    // Check if get was called first
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
    // Check if set was called with the correct structure
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [DOMAIN_COLORS_STORAGE_KEY]: {
        default: newDefault,
        domains: {}, // Initially empty
      },
    });

    // Verify the change in the mock store
    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.default).toEqual(newDefault);
  });

  it("should set a domain-specific theme", async () => {
    const domain = "example.com";
    const domainTheme = { mainAccentColor: "#aabbcc" };
    await setDomainColorTheme(domain, domainTheme);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [DOMAIN_COLORS_STORAGE_KEY]: {
        default: DEFAULT_COLORS, // Starts with default
        domains: { [domain]: domainTheme },
      },
    });

    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.domains[domain]).toEqual(domainTheme);
  });

  it("should throw error if setting domain theme with empty domain", async () => {
    const theme = { mainAccentColor: "#aabbcc" };
    await expect(setDomainColorTheme("", theme)).rejects.toThrow(
      "Domain cannot be empty"
    );
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("should remove a domain-specific theme", async () => {
    const domain = "example.com";
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: DEFAULT_COLORS,
      domains: { [domain]: { mainAccentColor: "#aabbcc" } },
    };

    await removeDomainColorTheme(domain);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [DOMAIN_COLORS_STORAGE_KEY]: {
        default: DEFAULT_COLORS,
        domains: {}, // Domain removed
      },
    });

    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.domains[domain]).toBeUndefined();
  });

  it("should not fail and not call set if removing a non-existent domain theme", async () => {
    const domain = "nonexistent.com";
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: DEFAULT_COLORS,
      domains: {},
    };

    await removeDomainColorTheme(domain);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
    // Should not have called set because nothing changed
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("should throw error if removing domain theme with empty domain", async () => {
    await expect(removeDomainColorTheme("")).rejects.toThrow(
      "Domain cannot be empty"
    );
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("should reset the default theme to hardcoded values", async () => {
    mockStorageStore[DOMAIN_COLORS_STORAGE_KEY] = {
      default: { mainAccentColor: "#aabbcc" },
      domains: {},
    };

    const resetTheme = await resetDefaultColorTheme();

    expect(resetTheme).toEqual(DEFAULT_COLORS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      DOMAIN_COLORS_STORAGE_KEY
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [DOMAIN_COLORS_STORAGE_KEY]: {
        default: DEFAULT_COLORS,
        domains: {},
      },
    });
    const themes = mockStorageStore[DOMAIN_COLORS_STORAGE_KEY];
    expect(themes.default).toEqual(DEFAULT_COLORS);
  });

  it("should apply color theme to document root", () => {
    // Mock document.documentElement
    const mockRoot = {
      style: {
        setProperty: vi.fn(),
      },
    };
    global.document = {
      documentElement: mockRoot,
    };

    const theme = {
      mainAccentColor: "#112233",
      hoverColor: "#445566",
      disabledColor: "#778899",
      summaryBgColor: "#aabbcc",
    };

    applyColorTheme(theme);

    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--main-accent-color",
      theme.mainAccentColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--hover-color",
      theme.hoverColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--disabled-color",
      theme.disabledColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--summary-bg-color",
      theme.summaryBgColor
    );
  });

  it("should apply default colors if theme object is invalid or missing values", () => {
    const mockRoot = {
      style: {
        setProperty: vi.fn(),
      },
    };
    global.document = {
      documentElement: mockRoot,
    };

    // Test with invalid theme object
    applyColorTheme(null);

    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--main-accent-color",
      DEFAULT_COLORS.mainAccentColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--hover-color",
      DEFAULT_COLORS.hoverColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--disabled-color",
      DEFAULT_COLORS.disabledColor
    );
    expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
      "--summary-bg-color",
      DEFAULT_COLORS.summaryBgColor
    );
  });
});
