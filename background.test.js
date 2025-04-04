/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";

jest.mock("./summariesCache.js", () => ({
  clearExpiredCache: jest.fn(),
}));

describe("Background Script", () => {
  beforeEach(() => {
    jest.resetModules();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("logs API key on load", async () => {
    const mockApiKey = "test-api-key";
    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (key === "summariesCache") {
        callback({});
      } else if (key[0] === "openaiApiKey") {
        callback({ openaiApiKey: mockApiKey });
      }
      return Promise.resolve();
    });

    await import("./background.js");

    // Wait for promises to resolve
    await new Promise(process.nextTick);

    expect(chrome.storage.local.get.mock.calls[1][0]).toEqual(["openaiApiKey"]);
    expect(console.log).toHaveBeenCalledWith("Current API Key:", mockApiKey);
  });

  test("logs API key changes", async () => {
    await import("./background.js");

    const mockChanges = {
      openaiApiKey: { newValue: "new-api-key" },
    };

    // Get the last registered listener and call it
    const lastCall = chrome.storage.onChanged.addListener.mock.calls[0][0];
    lastCall(mockChanges);

    expect(console.log).toHaveBeenCalledWith("API Key changed:", "new-api-key");
  });
});
