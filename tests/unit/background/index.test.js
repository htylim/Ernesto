import { vi } from "vitest";
import { clearExpiredCache } from "../../../src/common/cache/summariesCache.js";
import { clearExpiredAudioCache } from "../../../src/common/cache/speechifyCache.js";
import { clearExpiredPromptsCache } from "../../../src/common/cache/promptsCache.js";

vi.mock("../../../src/common/cache/summariesCache.js");
vi.mock("../../../src/common/cache/speechifyCache.js");
vi.mock("../../../src/common/cache/promptsCache.js");

describe("Background Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should clear expired caches on initial load", async () => {
    // Import the background service to trigger the initial cache cleanup
    await import("../../../src/background/index.js");

    expect(clearExpiredCache).toHaveBeenCalled();
    expect(clearExpiredAudioCache).toHaveBeenCalled();
    expect(clearExpiredPromptsCache).toHaveBeenCalled();
  });

  it("should clear expired caches periodically", async () => {
    // Import the background service
    await import("../../../src/background/index.js");

    // Clear initial calls
    vi.clearAllMocks();

    // Advance time by 1 hour
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(clearExpiredCache).toHaveBeenCalled();
    expect(clearExpiredAudioCache).toHaveBeenCalled();
    expect(clearExpiredPromptsCache).toHaveBeenCalled();
  });

  it("should configure context menus on extension install", async () => {
    await import("../../../src/background/index.js");

    // Simulate extension install
    const onInstalledCallback =
      chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    await onInstalledCallback({ reason: "install" });

    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: "openAndSummarize",
      title: "Open && Summarize",
      contexts: ["link"]
    });
  });

  it("should open sidepanel when extension icon is clicked", async () => {
    await import("../../../src/background/index.js");

    // Simulate extension icon click
    const onClickedCallback =
      chrome.action.onClicked.addListener.mock.calls[0][0];
    const mockTab = { id: 123 };
    onClickedCallback(mockTab);

    expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
      enabled: true,
      path: "src/sidepanel/index.html",
      tabId: 123,
    });
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 123 });
  });
});

// New describe block for Context Menu Handling
describe('Background Script Context Menu Handling', () => {
  let contextMenuCallback;

  beforeEach(async () => {
    vi.resetModules(); // Reset modules to ensure background script is re-evaluated
    vi.clearAllMocks(); // Clear all mocks before each test

    // Dynamically import the module to allow mocks to be set up first
    // and to re-run its top-level code (like addListener calls) for each test.
    await import("../../../src/background/index.js");

    // Capture the callback registered by the background script for contextMenus.onClicked
    if (chrome.contextMenus.onClicked.addListener.mock.calls.length > 0) {
      contextMenuCallback = chrome.contextMenus.onClicked.addListener.mock.calls[chrome.contextMenus.onClicked.addListener.mock.calls.length - 1][0];
    } else {
      // This path should ideally not be hit if the background script always adds the listener.
      throw new Error("chrome.contextMenus.onClicked.addListener was not called by the background script. Ensure mocks are correctly reset and the script runs.");
    }
  });

  it('should open link in a new tab when menuItemId is openAndSummarize and linkUrl is present', () => {
    const mockInfo = {
      menuItemId: 'openAndSummarize',
      linkUrl: 'https://example.com/link'
    };
    const mockTab = { id: 1, url: 'https://example.com/current' };

    contextMenuCallback(mockInfo, mockTab);

    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: 'https://example.com/link', active: false },
      expect.any(Function)
    );
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('should do nothing if menuItemId is not openAndSummarize', () => {
    const mockInfo = {
      menuItemId: 'otherMenuId',
      linkUrl: 'https://example.com/link'
    };
    const mockTab = { id: 1, url: 'https://example.com/current' };

    contextMenuCallback(mockInfo, mockTab);

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('should do nothing if linkUrl is missing', () => {
    const mockInfo = {
      menuItemId: 'openAndSummarize'
    };
    const mockTab = { id: 1, url: 'https://example.com/current' };

    contextMenuCallback(mockInfo, mockTab);

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });
});
