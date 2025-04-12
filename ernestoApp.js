import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { getSpeechifyAudio } from "./getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "./speechifyCache.js";
import { getApiKey } from "./apiKeyManager.js";
import { TabStateManager } from "./tabStateManager.js";
import { UIStateManager } from "./uiStateManager.js";
import { AudioController } from "./audioController.js";
import { getPromptResponse } from "./getPromptResponse.js";
import { getCachedPrompts, cachePrompts } from "./promptsCache.js";

const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
  PROMPT: "Processing your question...",
};

export class ErnestoApp {
  constructor() {
    this.uiManager = new UIStateManager();
    this.audioController = new AudioController(this.uiManager);
    this.tabStateManager = new TabStateManager();
    this.setupEventListeners();
    this.initializePanel();
  }

  setupEventListeners() {
    const { summarizeBtn, speechifyBtn, openOptionsBtn, closeBtn } =
      this.uiManager.getControlButtons();
    const { promptInput, submitPromptBtn } = this.uiManager.getPromptElements();

    summarizeBtn.addEventListener("click", () => this.summarize());
    speechifyBtn.addEventListener("click", () => this.speechify());
    openOptionsBtn.addEventListener("click", () =>
      chrome.runtime.openOptionsPage()
    );
    closeBtn.addEventListener("click", () => {
      window.close();
    });

    // Add prompt submit event listener
    if (submitPromptBtn) {
      submitPromptBtn.addEventListener("click", () => this.prompt());
    }

    // Add enter key event listener to prompt input
    if (promptInput) {
      promptInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.prompt();
        }
      });
    }

    // Listen for tab changes
    if (chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => this.handleTabChange());
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === "complete") {
          this.handleTabChange();
        }
      });
    }
  }

  async initializePanel() {
    await this.handleTabChange();
  }

  async handleTabChange() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      this.audioController.cleanup();
      return;
    }

    const tabState = await this.tabStateManager.getTabState(currentTab.id);
    if (!tabState) {
      this.uiManager.showTabUnavailable();
      this.audioController.cleanup();
      return;
    }

    try {
      if (!currentTab.url || currentTab.url.startsWith("chrome://")) {
        this.uiManager.showTabUnavailable();
        this.audioController.cleanup();
        return;
      }

      if (tabState.url !== currentTab.url) {
        this.uiManager.resetUI();

        await this.tabStateManager.updateTabState(currentTab.id, {
          url: currentTab.url,
          title: currentTab.title,
        });
      }

      this.uiManager.showTabContent(currentTab);
      this.restoreTabState(currentTab.id);
    } catch (error) {
      console.error("Error handling tab change:", error);
      this.uiManager.showTabUnavailable();
    }
  }

  async restoreTabState(tabId) {
    const tabState = await this.tabStateManager.getTabState(tabId);
    if (!tabState || !tabState.url) return;

    try {
      // Clear existing content first
      this.uiManager.setSummaryText("", true);
      this.uiManager.hideSummary();
      this.uiManager.clearPromptResponses();

      // Load cached summary if available
      const cachedSummary = await getCachedSummary(tabState.url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
      }

      // Load cached prompts if available
      const cachedPrompts = await getCachedPrompts(tabState.url);

      if (cachedPrompts && cachedPrompts.length > 0) {
        // Check if the cached data is in the new format
        if (cachedPrompts[0].type === "message") {
          // New format - extract user/assistant pairs
          for (let i = 0; i < cachedPrompts.length; i += 2) {
            const userMessage = cachedPrompts[i];
            const assistantMessage = cachedPrompts[i + 1];

            if (
              userMessage &&
              assistantMessage &&
              userMessage.role === "user" &&
              assistantMessage.role === "assistant"
            ) {
              const promptText = userMessage.content?.[0]?.text || "";
              const responseText = assistantMessage.content?.[0]?.text || "";

              if (promptText && responseText) {
                this.uiManager.addPromptResponse({
                  prompt: promptText,
                  response: responseText,
                  timestamp: Date.now(), // We don't have actual timestamp in new format
                });
              }
            }
          }
        } else {
          // Old format - each item has prompt and response
          for (const promptItem of cachedPrompts) {
            this.uiManager.addPromptResponse(promptItem);
          }
        }
      }
    } catch (error) {
      console.error("Error restoring tab state:", error);
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      return tab;
    } catch (error) {
      console.error("Error getting current tab:", error);
      return null;
    }
  }

  async getApiKey() {
    return await getApiKey();
  }

  async summarize() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      return;
    }

    const tabState = await this.tabStateManager.getTabState(currentTab.id);
    if (!tabState || !tabState.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      const url = tabState.url;
      console.log("Generating summary for:", url);

      this.uiManager.showLoading(LOADING_MESSAGES.SUMMARY);
      this.uiManager.hideSummary();

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.SUMMARY,
      });

      const apiKey = await this.getApiKey();
      const summary = await getSummary(url, apiKey);

      await cacheSummary(url, summary);
      this.uiManager.showSummary(summary);

      await this.tabStateManager.updateTabState(currentTab.id, {
        summary: summary,
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Summarization error:", error);
      this.uiManager.showError(error.message);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  async speechify() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      return;
    }

    const tabState = await this.tabStateManager.getTabState(currentTab.id);
    if (!tabState) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      if (!this.uiManager.isSummaryVisible()) {
        const success = await this.summarize();
        if (!success) return;
      }

      const url = tabState.url;

      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        this.audioController.cleanup();
        this.audioController.setupAudio(cachedAudioData, true);
        return true;
      }

      this.uiManager.showLoading(LOADING_MESSAGES.AUDIO);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.AUDIO,
      });

      const apiKey = await this.getApiKey();
      const summaryText = this.uiManager.getSummaryText();
      const audioBlob = await getSpeechifyAudio(summaryText, apiKey);

      await cacheAudio(url, audioBlob);
      this.audioController.setupAudio(audioBlob, true);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Speechify error:", error);
      this.uiManager.showError(error.message);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  async prompt() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      return;
    }

    const tabState = await this.tabStateManager.getTabState(currentTab.id);
    if (!tabState || !tabState.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    // Get the prompt text
    const promptText = this.uiManager.getPromptText();
    if (!promptText.trim()) {
      return; // Skip empty prompts
    }

    try {
      const url = tabState.url;
      console.log("Processing prompt for:", url);

      this.uiManager.showLoading(LOADING_MESSAGES.PROMPT);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.PROMPT,
      });

      // Get any existing prompts history
      let conversationHistory = (await getCachedPrompts(url)) || [];

      // Convert older format to new format if needed
      if (conversationHistory.length > 0 && conversationHistory[0].prompt) {
        conversationHistory = conversationHistory.flatMap((item) => [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: item.prompt }],
          },
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: item.response }],
          },
        ]);
      }

      const apiKey = await this.getApiKey();
      const { assistantMessage, output } = await getPromptResponse(
        promptText,
        url,
        conversationHistory,
        apiKey
      );

      // Add user's message and AI response to conversation history
      const userMessage = {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: promptText }],
      };

      // Updated conversation history
      const updatedHistory = [...conversationHistory, userMessage, ...output];

      // Cache the updated conversation history
      await cachePrompts(url, updatedHistory);

      // Create prompt item for UI display
      const promptItem = {
        prompt: promptText,
        response: assistantMessage,
        timestamp: Date.now(),
      };

      // Add to UI
      this.uiManager.addPromptResponse(promptItem);

      // Clear the input field
      this.uiManager.clearPromptInput();

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Prompt error:", error);
      this.uiManager.showError(error.message);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }
}
