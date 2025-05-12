import { getSummary } from "../common/api/getSummary.js";
import {
  getCachedSummary,
  cacheSummary,
} from "../common/cache/summariesCache.js";
import { getSpeechifyAudio } from "../common/api/getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "../common/cache/speechifyCache.js";
import { getApiKey } from "../common/managers/apiKeyManager.js";
import { TabStateManager } from "../common/managers/tabStateManager.js";
import { UIStateManager } from "../sidepanel/uiStateManager.js";
import { AudioController } from "../common/ui/audioController.js";
import {
  getCachedPrompts,
  cachePrompts,
} from "../common/cache/promptsCache.js";
import { getResponse } from "../common/api/getResponse.js";
import { extractArticleContent } from "./contentExtractor.js";
import { loadAndApplyColorTheme } from "../sidepanel/index.js";

const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
  PROMPT: "Processing your question...",
  EXTRACTION: "Extracting article content...",
};

export class ErnestoSidePanel {
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

      // apply new color theme
      await loadAndApplyColorTheme();

      // Load cached summary if available
      const cachedSummary = await getCachedSummary(tabState.url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
      }

      // Load cached prompts if available
      const conversationHistory = await getCachedPrompts(tabState.url);

      if (conversationHistory && conversationHistory.conversation) {
        const conversation = conversationHistory.conversation;

        // Process conversation pairs (user followed by assistant)
        for (let i = 0; i < conversation.length; i += 2) {
          if (i + 1 < conversation.length) {
            const userMessage = conversation[i];
            const assistantMessage = conversation[i + 1];

            if (
              userMessage.role === "user" &&
              assistantMessage.role === "assistant"
            ) {
              this.uiManager.addPromptResponse({
                prompt: userMessage.content,
                response: assistantMessage.content,
              });
            }
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

  async getPageContent() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) return null;

    try {
      // Try to ping the content script first
      const response = await chrome.tabs
        .sendMessage(currentTab.id, {
          action: "ping",
        })
        .catch(() => null);

      // If no response, content script isn't ready, try to inject it
      if (!response) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ["src/content/index.js"],
        });
        // Wait a bit for the script to initialize
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Now try to get the content
      const contentResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: "getPageContent",
      });

      if (!contentResponse || contentResponse.error) {
        throw new Error(contentResponse?.error || "Failed to get page content");
      }

      // Process the content with Readability in the extension context
      this.uiManager.showLoading(LOADING_MESSAGES.EXTRACTION);

      const processedContent = await extractArticleContent(
        contentResponse.content,
        contentResponse.metadata
      );

      this.uiManager.hideLoading();

      return JSON.stringify(processedContent);
    } catch (error) {
      console.error("Error getting page content:", error);
      this.uiManager.hideLoading();
      return null;
    }
  }

  async getCurrentTabUrl() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      return null;
    }

    const tabState = await this.tabStateManager.getTabState(currentTab.id);
    if (!tabState || !tabState.url) {
      return null;
    }

    return tabState?.url;
  }

  async summarize() {
    const pageContent = await this.getPageContent();
    if (!pageContent) {
      this.uiManager.showError("Could not get page content");
      return false;
    }

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
      const summary = await getSummary(url, apiKey, pageContent);

      await cacheSummary(url, summary);

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: false,
      });

      // the user might navigated away from `url` since we initiated the request.
      // don't update the UI if we are not at `url` anymore
      const currentUrl = await this.getCurrentTabUrl();
      if (currentUrl && url === currentUrl) {
        this.uiManager.showSummary(summary);
      }

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

    const tabState = this.tabStateManager.getTabState(currentTab.id);
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

      // ----------------------------------------------------------------
      // temporarily disable caching of audios, we need a better solution
      // await cacheAudio(url, audioBlob);
      // ----------------------------------------------------------------

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

      // Clear the input field
      this.uiManager.clearPromptInput();

      this.uiManager.showLoading(LOADING_MESSAGES.PROMPT);
      this.uiManager.updateButtonStates(); // Disable buttons during loading

      await this.tabStateManager.updateTabState(currentTab.id, {
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.PROMPT,
      });

      // Get existing conversation history or create new
      let conversationHistory = (await getCachedPrompts(url)) || {
        previous_response_id: null,
        conversation: [],
      };

      const apiKey = await this.getApiKey();
      const { assistantMessage, assistantMessageId } = await getResponse(
        promptText,
        url,
        conversationHistory.previous_response_id,
        apiKey
      );

      // Update conversation history with new messages
      conversationHistory.previous_response_id = assistantMessageId;
      conversationHistory.conversation.push(
        { role: "user", content: promptText },
        { role: "assistant", content: assistantMessage }
      );

      // Cache the updated conversation history
      await cachePrompts(url, conversationHistory);

      // Create prompt item for UI display
      const promptItem = {
        prompt: promptText,
        response: assistantMessage,
      };

      // Add to UI
      this.uiManager.addPromptResponse(promptItem);

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
      this.uiManager.updateButtonStates(); // Re-enable buttons after loading
    }
  }
}
