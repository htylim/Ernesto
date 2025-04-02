/**
 * @jest-environment jsdom
 */

describe("Options Page", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="apiKey" type="text">
      <button id="save">Save</button>
      <button id="cancel">Cancel</button>
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

    expect(document.querySelector("#apiKey").value).toBe(mockApiKey);
  });

  test("saves API key when save button is clicked", () => {
    require("./options.js");
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
  });
});
