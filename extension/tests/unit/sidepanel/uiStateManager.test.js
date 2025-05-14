import { describe, it, expect, beforeEach, vi } from "vitest";
import { UIStateManager } from "../../../src/sidepanel/uiStateManager";

describe("UIStateManager", () => {
  let uiStateManager;
  let mockElements;

  beforeEach(() => {
    // Mock window.marked
    global.window = {
      marked: {
        parse: vi.fn().mockReturnValue("Parsed markdown"),
      },
    };

    mockElements = {
      summarizeBtn: {
        disabled: true,
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
      },
      openOptionsBtn: { classList: { add: vi.fn(), remove: vi.fn() } },
      closeBtn: { classList: { add: vi.fn(), remove: vi.fn() } },
      speechifyBtn: {
        disabled: true,
        classList: { add: vi.fn(), remove: vi.fn() },
      },
      loadingDiv: {
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
      },
      summaryDiv: {
        textContent: "",
        innerHTML: "",
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        querySelector: vi.fn(),
      },
      promptResponsesDiv: {
        innerHTML: "",
        scrollIntoView: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn() },
      },
      audioPlayer: { classList: { add: vi.fn(), remove: vi.fn() } },
      playAudioBtn: { classList: { add: vi.fn(), remove: vi.fn() } },
      pauseAudioBtn: { classList: { add: vi.fn(), remove: vi.fn() } },
      restartAudioBtn: { classList: { add: vi.fn(), remove: vi.fn() } },
      loadingText: { textContent: "" },
      pageTitle: { textContent: "" },
      tabContent: {
        classList: { add: vi.fn(), remove: vi.fn() },
        scrollTop: 0,
        scrollHeight: 0,
      },
      tabUnavailable: { classList: { add: vi.fn(), remove: vi.fn() } },
      promptInput: { value: "" },
      submitPromptBtn: { disabled: true },
      audioTitle: { innerHTML: "" },
      promptContainer: { classList: { add: vi.fn(), remove: vi.fn() } },
    };

    vi.spyOn(document, "getElementById").mockImplementation((id) => {
      const mappings = {
        summarize: mockElements.summarizeBtn,
        openOptions: mockElements.openOptionsBtn,
        closePanel: mockElements.closeBtn,
        speechify: mockElements.speechifyBtn,
        loading: mockElements.loadingDiv,
        summary: mockElements.summaryDiv,
        promptResponses: mockElements.promptResponsesDiv,
        audioPlayer: mockElements.audioPlayer,
        playAudio: mockElements.playAudioBtn,
        pauseAudio: mockElements.pauseAudioBtn,
        restartAudio: mockElements.restartAudioBtn,
        loadingText: mockElements.loadingText,
        "page-title": mockElements.pageTitle,
        "tab-content": mockElements.tabContent,
        "tab-unavailable": mockElements.tabUnavailable,
        promptInput: mockElements.promptInput,
        submitPrompt: mockElements.submitPromptBtn,
        "audio-title": mockElements.audioTitle,
      };
      return mappings[id];
    });
    vi.spyOn(document, "querySelector").mockReturnValue(
      mockElements.promptContainer
    );

    uiStateManager = new UIStateManager();
  });

  describe("showLoading", () => {
    it("should show loading state and update button states", () => {
      const message = "Loading...";
      uiStateManager.showLoading(message);

      expect(mockElements.loadingDiv.classList.remove).toHaveBeenCalled();
      expect(mockElements.loadingText.textContent).toBe(message);
      expect(mockElements.summarizeBtn.disabled).toBe(true);
      expect(mockElements.speechifyBtn.disabled).toBe(true);
      expect(mockElements.submitPromptBtn.disabled).toBe(true);
    });
  });

  describe("hideLoading", () => {
    it("should hide loading state and update button states", () => {
      mockElements.loadingDiv.classList.contains.mockReturnValue(true);
      mockElements.summarizeBtn.disabled = true;
      mockElements.speechifyBtn.disabled = true;
      mockElements.submitPromptBtn.disabled = true;

      uiStateManager.hideLoading();

      expect(mockElements.loadingDiv.classList.add).toHaveBeenCalledWith(
        "hidden"
      );
      expect(mockElements.summarizeBtn.disabled).toBe(false);
      expect(mockElements.speechifyBtn.disabled).toBe(false);
      expect(mockElements.submitPromptBtn.disabled).toBe(false);
    });
  });

  describe("showSummary", () => {
    it("should show summary content and update button states", () => {
      const summary = "<h1>Test Summary</h1>";
      uiStateManager.showSummary(summary);

      expect(mockElements.summaryDiv.classList.remove).toHaveBeenCalled();
      expect(mockElements.summaryDiv.innerHTML).toBe(summary);
    });
  });

  describe("showError", () => {
    it("should show error message in summary", () => {
      const error = "Test error";
      uiStateManager.showError(error);

      expect(mockElements.summaryDiv.classList.remove).toHaveBeenCalled();
      expect(mockElements.summaryDiv.textContent).toBe(`Error: ${error}`);
    });
  });

  describe("showTabContent", () => {
    it("should show tab content with title", () => {
      const title = "Test Title";
      uiStateManager.showTabContent(title);

      expect(mockElements.tabContent.classList.remove).toHaveBeenCalled();
      expect(mockElements.tabUnavailable.classList.add).toHaveBeenCalled();
      expect(mockElements.pageTitle.textContent).toBe(title);
    });
  });

  describe("showTabUnavailable", () => {
    it("should show tab unavailable message", () => {
      uiStateManager.showTabUnavailable();

      expect(mockElements.tabContent.classList.add).toHaveBeenCalled();
      expect(mockElements.tabUnavailable.classList.remove).toHaveBeenCalled();
    });
  });

  describe("resetUI", () => {
    it("should reset all UI elements to initial state", () => {
      uiStateManager.resetUI();

      expect(mockElements.summaryDiv.classList.add).toHaveBeenCalled();
      expect(mockElements.loadingDiv.classList.add).toHaveBeenCalled();
      expect(mockElements.promptResponsesDiv.innerHTML).toBe("");
    });
  });

  describe("addPromptResponse", () => {
    it("should add prompt response to UI and scroll to bottom", () => {
      const promptData = {
        prompt: "Test prompt",
        response: "Test response",
      };

      uiStateManager.addPromptResponse(promptData);

      expect(mockElements.promptResponsesDiv.innerHTML).toContain(
        "Test prompt"
      );
      expect(mockElements.promptResponsesDiv.scrollIntoView).toHaveBeenCalled();
      expect(mockElements.tabContent.scrollTop).toBe(
        mockElements.tabContent.scrollHeight
      );
    });
  });

  describe("getPromptText", () => {
    it("should return prompt input value", () => {
      mockElements.promptInput.value = "Test prompt";
      expect(uiStateManager.getPromptText()).toBe("Test prompt");
    });
  });

  describe("clearPromptInput", () => {
    it("should clear prompt input value", () => {
      mockElements.promptInput.value = "Test prompt";
      uiStateManager.clearPromptInput();
      expect(mockElements.promptInput.value).toBe("");
    });
  });

  describe("setAudioTitle", () => {
    it("should set audio title", () => {
      const title = "Test Title";
      uiStateManager.setAudioTitle(title);
      expect(mockElements.audioTitle.innerHTML).toBe(title);
    });
  });

  describe("readArticleTitle", () => {
    it("should extract article title from summary", () => {
      const h1Element = { textContent: "Test Title" };
      mockElements.summaryDiv.querySelector.mockReturnValue(h1Element);
      expect(uiStateManager.readArticleTitle()).toBe("Test Title");
    });

    it("should return empty string if no title found", () => {
      mockElements.summaryDiv.querySelector.mockReturnValue(null);
      expect(uiStateManager.readArticleTitle()).toBe("");
    });
  });
});
