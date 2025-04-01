describe("Background Script", () => {
  beforeEach(() => {
    jest.resetModules();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("logs API key on load", () => {
    const mockApiKey = "test-api-key";
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ openaiApiKey: mockApiKey });
    });

    require("./background.js");

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      ["openaiApiKey"],
      expect.any(Function)
    );
    expect(console.log).toHaveBeenCalledWith("Current API Key:", mockApiKey);
  });

  test("logs API key changes", () => {
    require("./background.js");

    const mockChanges = {
      openaiApiKey: { newValue: "new-api-key" },
    };

    // Simulate storage change
    const lastCall = chrome.storage.onChanged.addListener.mock.calls[0][0];
    lastCall(mockChanges);

    expect(console.log).toHaveBeenCalledWith("API Key changed:", "new-api-key");
  });
});
