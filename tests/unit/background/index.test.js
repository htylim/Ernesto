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

  it("should configure sidepanel on extension install", async () => {
    await import("../../../src/background/index.js");

    // Simulate extension install
    const onInstalledCallback =
      chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    await onInstalledCallback({ reason: "install" });

    expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
      enabled: true,
      path: "src/sidepanel/index.html",
      tabId: null,
    });
  });

  it("should open sidepanel when extension icon is clicked", async () => {
    await import("../../../src/background/index.js");

    // Simulate extension icon click
    const onClickedCallback =
      chrome.action.onClicked.addListener.mock.calls[0][0];
    const mockTab = { id: 123 };
    onClickedCallback(mockTab);

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 123 });
  });
});
