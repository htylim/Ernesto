/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";

jest.mock("./summariesCache.js", () => ({
  clearCache: jest.fn(),
}));

describe("Options Page", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="apiKey" type="text">
      <button id="save">Save</button>
      <button id="cancel">Cancel</button>
      <button id="purgeCache">Purge Cache</button>
      <span id="purgeStatus"></span>
    `;

    // Mock window.close
    delete window.close;
    window.close = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("loads saved API key on init", async () => {
    const mockApiKey = "test-api-key";
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ openaiApiKey: mockApiKey });
      return Promise.resolve({ openaiApiKey: mockApiKey });
    });

    await import("./options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Wait for promises to resolve
    await new Promise(process.nextTick);

    expect(document.querySelector("#apiKey").value).toBe(mockApiKey);
  });

  test("saves API key when save button is clicked", async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await import("./options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const input = document.querySelector("#apiKey");
    const saveButton = document.querySelector("#save");
    const mockApiKey = "new-api-key";

    input.value = mockApiKey;
    saveButton.click();

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { openaiApiKey: mockApiKey },
      expect.any(Function)
    );
    expect(window.close).toHaveBeenCalled();
  });
});
