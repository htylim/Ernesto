/**
 * @jest-environment jsdom
 */

describe("Options Page", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input data-testid="api-key-input" type="text">
      <button data-testid="save-button">Save</button>
      <button data-testid="cancel-button">Cancel</button>
    `;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("loads saved API key on init", () => {
    const mockApiKey = "test-api-key";
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ openaiApiKey: mockApiKey });
    });

    require("./options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(document.querySelector('[data-testid="api-key-input"]').value).toBe(
      mockApiKey
    );
  });

  test("saves API key when save button is clicked", () => {
    require("./options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const input = document.querySelector('[data-testid="api-key-input"]');
    const saveButton = document.querySelector('[data-testid="save-button"]');
    const mockApiKey = "new-api-key";

    input.value = mockApiKey;
    saveButton.click();

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { openaiApiKey: mockApiKey },
      expect.any(Function)
    );
  });
});
