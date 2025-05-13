import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErnestoSidePanel } from "../../../src/core/ernestoSidePanel";
import { UIStateManager } from "../../../src/sidepanel/uiStateManager";
import { AudioController } from "../../../src/common/ui/audioController";
import { getSummary } from "../../../src/common/api/getSummary";
import { getSpeechifyAudio } from "../../../src/common/api/getSpeechifyAudio";
import { getResponse } from "../../../src/common/api/getResponse";
import { getCachedSummary } from "../../../src/common/cache/summariesCache";
import { getCachedPrompts } from "../../../src/common/cache/promptsCache";

// Mock dependencies
vi.mock("../../../src/common/ui/audioController");
vi.mock("../../../src/common/api/getSummary");
vi.mock("../../../src/common/api/getSpeechifyAudio");
vi.mock("../../../src/common/cache/summariesCache");
vi.mock("../../../src/common/cache/speechifyCache");
vi.mock("../../../src/common/cache/promptsCache");
vi.mock("../../../src/common/api/getResponse");
vi.mock("../../../src/core/contentExtractor");
vi.mock("../../../src/common/managers/apiKeyManager", () => ({
  getApiKey: vi.fn().mockResolvedValue("test-api-key"),
}));

// Mock UIStateManager
vi.mock("../../../src/sidepanel/uiStateManager", () => {
  const UIStateManager = vi.fn();
  UIStateManager.prototype.getControlButtons = vi.fn().mockReturnValue({
    summarizeBtn: { addEventListener: vi.fn() },
    speechifyBtn: { addEventListener: vi.fn() },
    openOptionsBtn: { addEventListener: vi.fn() },
    closeBtn: { addEventListener: vi.fn() },
  });
  UIStateManager.prototype.getPromptElements = vi.fn().mockReturnValue({
    promptInput: { addEventListener: vi.fn() },
    submitPromptBtn: { addEventListener: vi.fn() },
  });
  UIStateManager.prototype.showTabUnavailable = vi.fn();
  UIStateManager.prototype.showTabContent = vi.fn();
  UIStateManager.prototype.resetUI = vi.fn();
  UIStateManager.prototype.showLoading = vi.fn();
  UIStateManager.prototype.hideLoading = vi.fn();
  UIStateManager.prototype.showError = vi.fn();
  UIStateManager.prototype.showSummary = vi.fn();
  UIStateManager.prototype.hideSummary = vi.fn();
  UIStateManager.prototype.getSummaryText = vi.fn();
  UIStateManager.prototype.clearPromptInput = vi.fn();
  UIStateManager.prototype.addPromptResponse = vi.fn();
  UIStateManager.prototype.clearPromptResponses = vi.fn();
  UIStateManager.prototype.updateButtonStates = vi.fn();
  UIStateManager.prototype.setSummaryText = vi.fn();
  UIStateManager.prototype.getPromptText = vi.fn();
  UIStateManager.prototype.isSummaryVisible = vi.fn().mockReturnValue(true);
  return { UIStateManager };
});

describe("ErnestoSidePanel", () => {
  let ernestoSidePanel;
  const mockTabId = 123;
  const mockTab = { 
    id: mockTabId, 
    url: "https://example.com", 
    title: "Test" 
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock chrome API
    global.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([mockTab]),
        get: vi.fn().mockResolvedValue(mockTab),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        sendMessage: vi.fn().mockResolvedValue({
          content: "test content",
          metadata: { title: "Test" },
        }),
      },
      runtime: {
        openOptionsPage: vi.fn(),
      },
      scripting: {
        executeScript: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue({}),
        },
      },
    };

    // Mock document
    document.getElementById = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
    }));
    document.querySelector = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    }));

    // Mock window.close
    global.window = {
      close: vi.fn(),
      location: {
        search: "?tabId=123"
      }
    };

    // Create instance
    ernestoSidePanel = new ErnestoSidePanel();
    
    // Set the tabId directly for testing
    ernestoSidePanel.tabId = mockTabId;
  });

  it("should initialize with correct dependencies", () => {
    expect(ernestoSidePanel).toBeDefined();
    expect(UIStateManager).toHaveBeenCalled();
    expect(AudioController).toHaveBeenCalled();
  });
  
  it("should initialize tabId from URL parameter", async () => {
    // Reset tabId for this test
    ernestoSidePanel.tabId = null;
    
    // Mock URL parameter
    global.window.location.search = "?tabId=123";
    
    // Create a new instance to test initialization
    const newInstance = new ErnestoSidePanel();
    
    // Skip the constructor's initializePanel call by directly calling it here
    // This allows us to control the timing and verify the result
    await newInstance.initializePanel();
    
    expect(newInstance.tabId).toBe(123);
  });

  it("should log error when no tabId is provided in URL", async () => {
    // Reset tabId for this test
    ernestoSidePanel.tabId = null;
    
    // Mock empty URL parameter
    global.window.location.search = "";
    
    // Create a new instance to test initialization
    const newInstance = new ErnestoSidePanel();
    
    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    // Skip the constructor's initializePanel call by directly calling it here
    await newInstance.initializePanel();
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("No tabId provided in URL parameters"));
  });

  it("should handle tab change with valid tab", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValueOnce(mockTab);
    
    // Spy on refreshTab to prevent it from executing
    const refreshTabSpy = vi.spyOn(ernestoSidePanel, 'refreshTab').mockImplementation(() => {});

    await ernestoSidePanel.handleTabChange();

    // Only test that refreshTab was called
    expect(refreshTabSpy).toHaveBeenCalled();
  });

  it("should handle tab change with invalid tab", async () => {
    // Mock getCurrentTab to return null (invalid tab)
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValueOnce(null);

    await ernestoSidePanel.handleTabChange();

    expect(UIStateManager.prototype.showTabUnavailable).toHaveBeenCalled();
  });

  it("should use tabId to get tab information when available", async () => {
    // Reset mocks before the test
    vi.clearAllMocks();
    
    // Create mock implementation
    const mockImpl = {
      tabId: mockTabId,
      getCurrentTab: ErnestoSidePanel.prototype.getCurrentTab
    };
    
    // Call getCurrentTab with the mock
    await mockImpl.getCurrentTab();
    
    // Check that it called tabs.get with the tabId
    expect(chrome.tabs.get).toHaveBeenCalledWith(mockTabId);
  });

  it("should restore cached state on tab change", async () => {
    const mockSummary = "Test summary";
    const mockConversation = {
      conversation: [
        { role: "user", content: "test question" },
        { role: "assistant", content: "test answer" },
      ],
    };
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;
    
    getCachedSummary.mockResolvedValueOnce(mockSummary);
    getCachedPrompts.mockResolvedValueOnce(mockConversation);

    await ernestoSidePanel.refreshTab();

    expect(UIStateManager.prototype.showSummary).toHaveBeenCalledWith(
      mockSummary
    );
    expect(UIStateManager.prototype.addPromptResponse).toHaveBeenCalledWith({
      prompt: "test question",
      response: "test answer",
    });
  });

  it("should handle summarize action", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    vi.spyOn(ernestoSidePanel, 'getPageContent').mockResolvedValue(JSON.stringify({ content: "test" }));
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;

    await ernestoSidePanel.summarize();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
  });

  it("should handle summarize error", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    vi.spyOn(ernestoSidePanel, 'getPageContent').mockResolvedValue(null);
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;

    await ernestoSidePanel.summarize();

    expect(UIStateManager.prototype.showError).toHaveBeenCalledWith(
      "Could not get page content"
    );
  });

  it("should handle speechify action", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;
    
    UIStateManager.prototype.getSummaryText.mockReturnValue("test summary");
    UIStateManager.prototype.isSummaryVisible.mockReturnValue(false);
    vi.spyOn(ernestoSidePanel, 'summarize').mockResolvedValue(true);

    await ernestoSidePanel.speechify();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
  });

  it("should handle speechify error", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;
    
    UIStateManager.prototype.getSummaryText.mockReturnValue("test summary");
    UIStateManager.prototype.isSummaryVisible.mockReturnValue(false);
    vi.spyOn(ernestoSidePanel, 'summarize').mockResolvedValue(false);

    await ernestoSidePanel.speechify();

    // If summarize fails, speechify should exit early without showing error
    expect(UIStateManager.prototype.showError).not.toHaveBeenCalled();
  });

  it("should handle prompt action", async () => {
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;
    
    UIStateManager.prototype.getPromptText.mockReturnValue("test prompt");
    getResponse.mockResolvedValueOnce({
      assistantMessage: "test response",
      assistantMessageId: "test-id",
    });

    await ernestoSidePanel.prompt();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.addPromptResponse).toHaveBeenCalledWith({
      prompt: "test prompt",
      response: "test response",
    });
  });

  it("should handle prompt error", async () => {
    const error = new Error("Test error");
    
    // Mock getCurrentTab to return the mockTab
    vi.spyOn(ernestoSidePanel, 'getCurrentTab').mockResolvedValue(mockTab);
    
    // Set the url property directly
    ernestoSidePanel.url = mockTab.url;
    
    UIStateManager.prototype.getPromptText.mockReturnValue("test prompt");
    getResponse.mockRejectedValueOnce(error);

    await ernestoSidePanel.prompt();

    expect(UIStateManager.prototype.showError).toHaveBeenCalledWith(
      error.message
    );
  });

  it("should setup event listeners for control buttons", () => {
    const { summarizeBtn, speechifyBtn, openOptionsBtn, closeBtn } =
      ernestoSidePanel.uiManager.getControlButtons();
    const { promptInput, submitPromptBtn } =
      ernestoSidePanel.uiManager.getPromptElements();

    expect(summarizeBtn.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
    expect(speechifyBtn.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
    expect(openOptionsBtn.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
    expect(closeBtn.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
    expect(submitPromptBtn.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function)
    );
    expect(promptInput.addEventListener).toHaveBeenCalledWith(
      "keypress",
      expect.any(Function)
    );
  });

  it("should call summarize when summarize button is clicked", async () => {
    const { summarizeBtn } = ernestoSidePanel.uiManager.getControlButtons();
    const clickHandler = summarizeBtn.addEventListener.mock.calls[0][1];
    
    // Mock the summarize method
    const summarizeSpy = vi.spyOn(ernestoSidePanel, 'summarize').mockResolvedValue(true);

    await clickHandler();

    expect(summarizeSpy).toHaveBeenCalled();
  });

  it("should call speechify when speechify button is clicked", async () => {
    const { speechifyBtn } = ernestoSidePanel.uiManager.getControlButtons();
    const clickHandler = speechifyBtn.addEventListener.mock.calls[0][1];
    
    // Mock the speechify method
    const speechifySpy = vi.spyOn(ernestoSidePanel, 'speechify').mockResolvedValue(true);

    await clickHandler();

    expect(speechifySpy).toHaveBeenCalled();
  });

  it("should call prompt when submit button is clicked", async () => {
    const { submitPromptBtn } = ernestoSidePanel.uiManager.getPromptElements();
    const clickHandler = submitPromptBtn.addEventListener.mock.calls[0][1];
    
    // Mock the prompt method
    const promptSpy = vi.spyOn(ernestoSidePanel, 'prompt').mockResolvedValue(true);

    await clickHandler();

    expect(promptSpy).toHaveBeenCalled();
  });

  it("should call prompt when enter key is pressed in prompt input", async () => {
    const { promptInput } = ernestoSidePanel.uiManager.getPromptElements();
    const keypressHandler = promptInput.addEventListener.mock.calls[0][1];
    
    // Spy on prompt method
    const promptSpy = vi.spyOn(ernestoSidePanel, "prompt").mockResolvedValue(true);

    // Mock event
    const event = { 
      key: "Enter", 
      preventDefault: vi.fn() 
    };

    await keypressHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(promptSpy).toHaveBeenCalled();
  });

  it("should open options page when options button is clicked", () => {
    const { openOptionsBtn } = ernestoSidePanel.uiManager.getControlButtons();
    const clickHandler = openOptionsBtn.addEventListener.mock.calls[0][1];

    clickHandler();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it("should close window when close button is clicked", () => {
    const { closeBtn } = ernestoSidePanel.uiManager.getControlButtons();
    const clickHandler = closeBtn.addEventListener.mock.calls[0][1];

    clickHandler();

    expect(window.close).toHaveBeenCalled();
  });
});
