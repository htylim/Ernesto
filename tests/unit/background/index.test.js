import { vi } from "vitest";
import { clearExpiredCache } from "../../../src/common/cache/summariesCache.js";
import { clearExpiredAudioCache } from "../../../src/common/cache/speechifyCache.js";
import { clearExpiredPromptsCache } from "../../../src/common/cache/promptsCache.js";

vi.mock("../../../src/common/cache/summariesCache.js");
vi.mock("../../../src/common/cache/speechifyCache.js");
vi.mock("../../../src/common/cache/promptsCache.js");

// Mock Chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  sidePanel: {
    setOptions: vi.fn(),
    open: vi.fn(),
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
});
