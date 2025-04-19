import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErnestoApp } from "../../../src/core/ernestoApp";
import { UIStateManager } from "../../../src/sidepanel/uiStateManager";
import { AudioController } from "../../../src/common/ui/audioController";
import { TabStateManager } from "../../../src/common/managers/tabStateManager";
import { getSummary } from "../../../src/common/api/getSummary";
import { getSpeechifyAudio } from "../../../src/common/api/getSpeechifyAudio";
import { getResponse } from "../../../src/common/api/getResponse";
import { getCachedSummary } from "../../../src/common/cache/summariesCache";
import { getCachedPrompts } from "../../../src/common/cache/promptsCache";

// Mock dependencies
vi.mock("../../../src/common/ui/audioController");
vi.mock("../../../src/common/managers/tabStateManager");
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

describe("ErnestoApp", () => {
  let ernestoApp;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock chrome API
    global.chrome = {
      tabs: {
        query: vi
          .fn()
          .mockResolvedValue([{ id: 1, url: "https://example.com" }]),
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

    // Create instance
    ernestoApp = new ErnestoApp();
  });

  it("should initialize with correct dependencies", () => {
    expect(ernestoApp).toBeDefined();
    expect(UIStateManager).toHaveBeenCalled();
    expect(AudioController).toHaveBeenCalled();
    expect(TabStateManager).toHaveBeenCalled();
  });

  it("should handle tab change with valid tab", async () => {
    const mockTab = { id: 1, url: "https://example.com", title: "Test" };
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });

    await ernestoApp.handleTabChange();

    expect(UIStateManager.prototype.showTabContent).toHaveBeenCalledWith(
      mockTab
    );
  });

  it("should handle tab change with invalid tab", async () => {
    global.chrome.tabs.query.mockResolvedValueOnce([]);

    await ernestoApp.handleTabChange();

    expect(UIStateManager.prototype.showTabUnavailable).toHaveBeenCalled();
  });

  it("should restore cached state on tab change", async () => {
    const mockTab = { id: 1, url: "https://example.com", title: "Test" };
    const mockSummary = "Test summary";
    const mockConversation = {
      conversation: [
        { role: "user", content: "test question" },
        { role: "assistant", content: "test answer" },
      ],
    };

    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    getCachedSummary.mockResolvedValueOnce(mockSummary);
    getCachedPrompts.mockResolvedValueOnce(mockConversation);

    await ernestoApp.restoreTabState(mockTab.id);

    expect(UIStateManager.prototype.showSummary).toHaveBeenCalledWith(
      mockSummary
    );
    expect(UIStateManager.prototype.addPromptResponse).toHaveBeenCalledWith({
      prompt: "test question",
      response: "test answer",
    });
  });

  it("should handle summarize action", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });

    await ernestoApp.summarize();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
  });

  it("should handle summarize error", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    const error = new Error("Test error");
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    global.chrome.tabs.sendMessage.mockRejectedValueOnce(error);

    await ernestoApp.summarize();

    expect(UIStateManager.prototype.showError).toHaveBeenCalledWith(
      "Could not get page content"
    );
  });

  it("should handle speechify action", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    UIStateManager.prototype.getSummaryText.mockReturnValue("test summary");
    UIStateManager.prototype.isSummaryVisible.mockReturnValue(false);

    await ernestoApp.speechify();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
  });

  it("should handle speechify error", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    const error = new Error("Test error");
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    UIStateManager.prototype.getSummaryText.mockReturnValue("test summary");
    UIStateManager.prototype.isSummaryVisible.mockReturnValue(false);
    global.chrome.tabs.sendMessage.mockRejectedValueOnce(error);

    await ernestoApp.speechify();

    expect(UIStateManager.prototype.showError).toHaveBeenCalledWith(
      "Could not get page content"
    );
  });

  it("should handle prompt action", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    UIStateManager.prototype.getPromptText.mockReturnValue("test prompt");
    getResponse.mockResolvedValueOnce({
      assistantMessage: "test response",
      assistantMessageId: "test-id",
    });

    await ernestoApp.prompt();

    expect(UIStateManager.prototype.showLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.hideLoading).toHaveBeenCalled();
    expect(UIStateManager.prototype.addPromptResponse).toHaveBeenCalledWith({
      prompt: "test prompt",
      response: "test response",
    });
  });

  it("should handle prompt error", async () => {
    const mockTab = { id: 1, url: "https://example.com" };
    const error = new Error("Test error");
    global.chrome.tabs.query.mockResolvedValueOnce([mockTab]);
    TabStateManager.prototype.getTabState.mockResolvedValueOnce({
      url: mockTab.url,
    });
    UIStateManager.prototype.getPromptText.mockReturnValue("test prompt");
    getResponse.mockRejectedValueOnce(error);

    await ernestoApp.prompt();

    expect(UIStateManager.prototype.showError).toHaveBeenCalledWith(
      error.message
    );
  });
});
