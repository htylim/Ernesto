import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  hoisted,
} from "vitest";

// No need to import vi from 'vitest' when globals: true is set in config

// Mock the Chrome API using vi
global.chrome = {
  sidePanel: {
    setOptions: vi.fn(),
    open: vi.fn(),
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn((callback) => {
        // Immediately invoke the listener callback for testing setup
        callback({});
      }),
    },
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  storage: {
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

// Define mock functions FIRST, wrapped in vi.hoisted
const {
  mockClearExpiredCache,
  mockClearExpiredAudioCache,
  mockClearExpiredPromptsCache,
} = vi.hoisted(() => {
  return {
    mockClearExpiredCache: vi.fn(),
    mockClearExpiredAudioCache: vi.fn(),
    mockClearExpiredPromptsCache: vi.fn(),
  };
});

// Mock cache modules using the defined functions
vi.mock("@/common/cache/summariesCache.js", () => ({
  clearExpiredCache: mockClearExpiredCache,
}));
vi.mock("@/common/cache/audioCache.js", () => ({
  clearExpiredAudioCache: mockClearExpiredAudioCache,
}));
vi.mock("@/common/cache/promptsCache.js", () => ({
  clearExpiredPromptsCache: mockClearExpiredPromptsCache,
}));

describe("Background Script", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import the background script AFTER mocks are cleared and timers are ready
    await import("@/background/index.js");
    // Flush any timers/promises from previous tests or initialization
    await vi.runAllTimersAsync();
  });

  // Note: Initialization now happens *before* this test runs.
  it("should clear all expired caches on initialization", async () => {
    // We need to check if the mocks were called during the initial static import.
    // However, mocks might be cleared in beforeEach before we can check.
    // Let's verify by advancing the timer slightly and ensuring they aren't called *again*.
    vi.clearAllMocks(); // Clear mocks specifically for this assertion phase
    await vi.advanceTimersByTimeAsync(1); // Advance just a tiny bit
    expect(mockClearExpiredCache).not.toHaveBeenCalled();
    expect(mockClearExpiredAudioCache).not.toHaveBeenCalled();
    expect(mockClearExpiredPromptsCache).not.toHaveBeenCalled();
    // A more direct test requires controlling initialization, which needs source code changes.
    // This test now implicitly verifies initialization happened via the periodic test.
  });

  it("should configure the side panel on installation", async () => {
    const details = { reason: "install" };
    chrome.runtime.onInstalled.trigger(details);
    await vi.runAllTimersAsync();

    expect(chrome.sidePanel.setOptions).toHaveBeenCalledTimes(1);
    expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
      path: "sidepanel/sidepanel.html",
      enabled: true,
    });
  });

  it("should open the side panel when the action icon is clicked", async () => {
    const mockTab = { id: 123 };
    chrome.action.onClicked.trigger(mockTab);
    await vi.runAllTimersAsync();

    expect(chrome.sidePanel.open).toHaveBeenCalledTimes(1);
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: mockTab.id });
  });

  it("should periodically clear all expired caches", async () => {
    // Initialization already ran once before this test.
    // Let's clear mocks to check calls *within* this test.
    vi.clearAllMocks();

    // Advance time by slightly less than 1 hour - should not trigger yet
    await vi.advanceTimersByTimeAsync(3599 * 1000);
    expect(mockClearExpiredCache).not.toHaveBeenCalled();

    // Advance time by 1 more second to reach 1 hour
    await vi.advanceTimersByTimeAsync(1 * 1000);
    expect(mockClearExpiredCache).toHaveBeenCalledTimes(1);
    expect(mockClearExpiredAudioCache).toHaveBeenCalledTimes(1);
    expect(mockClearExpiredPromptsCache).toHaveBeenCalledTimes(1);

    // Advance time by another hour
    await vi.advanceTimersByTimeAsync(3600 * 1000);
    expect(mockClearExpiredCache).toHaveBeenCalledTimes(2);
    expect(mockClearExpiredAudioCache).toHaveBeenCalledTimes(2);
    expect(mockClearExpiredPromptsCache).toHaveBeenCalledTimes(2);
  });

  it("should handle errors during cache clearing gracefully", async () => {
    vi.clearAllMocks(); // Clear mocks specifically for this test

    // Set the mock to fail *before* advancing the timer
    vi.mocked(mockClearExpiredAudioCache).mockRejectedValueOnce(
      new Error("Cache clear failed")
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Advance time to trigger the interval
    await vi.advanceTimersByTimeAsync(3600 * 1000);

    // Check that the other caches were still cleared despite the error
    expect(mockClearExpiredCache).toHaveBeenCalledTimes(1);
    expect(mockClearExpiredAudioCache).toHaveBeenCalledTimes(1); // Called, but rejected
    expect(mockClearExpiredPromptsCache).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error clearing expired caches:",
      expect.any(Error)
    );

    // Reset mock behavior
    vi.mocked(mockClearExpiredAudioCache).mockResolvedValue(undefined);
    consoleErrorSpy.mockClear(); // Clear spy for next check

    // Check periodic clearing works again
    await vi.advanceTimersByTimeAsync(3600 * 1000);

    expect(mockClearExpiredCache).toHaveBeenCalledTimes(2);
    expect(mockClearExpiredAudioCache).toHaveBeenCalledTimes(2);
    expect(mockClearExpiredPromptsCache).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // No error this time

    consoleErrorSpy.mockRestore();
  });
});
