import { getSummary } from "../common/api/getSummary.js";
import {
  getCachedSummary,
  cacheSummary,
} from "../common/cache/summariesCache.js";
import { getSpeechifyAudio } from "../common/api/getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "../common/cache/speechifyCache.js";
import { getApiKey } from "../common/managers/apiKeyManager.js";
import { UIStateManager } from "../sidepanel/uiStateManager.js";
import { AudioController } from "../common/ui/audioController.js";
import {
  getCachedPrompts,
  cachePrompts,
} from "../common/cache/promptsCache.js";
import { getResponse } from "../common/api/getResponse.js";
import { extractArticleContent } from "./contentExtractor.js";
import { loadAndApplyColorTheme } from "../sidepanel/index.js";

/**
 * Messages displayed during various loading states
 */
const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
  PROMPT: "Processing your question...",
  EXTRACTION: "Extracting article content...",
};

/**
 * Manages the side panel functionality for a specific browser tab
 * 
 * Responsible for handling all tab-specific operations including:
 * - Summarizing web page content
 * - Converting summaries to audio (text-to-speech)
 * - Processing user prompts and displaying AI responses
 * - Caching results for better performance
 * - Managing UI state and loading indicators
 * 
 * Each ErnestoSidePanel instance is tied to a specific browser tab (identified
 * by tabId) and maintains its own state, preventing cross-contamination between
 * different tabs.
 */
export class ErnestoSidePanel {
  /**
   * Creates a new ErnestoSidePanel instance for a specific browser tab
   */
  constructor() {
    this.uiManager = new UIStateManager();
    this.audioController = new AudioController(this.uiManager);
    
    // Tab state properties
    this.tabId = null; // Will be initialized in initializePanel
    this.url = null;
    this.title = null;
    this.isLoading = false;
    this.loadingMessage = "";
    this.summarizeOnOpenFlag = false; // Whether to automatically summarize on open
    
    this.setupEventListeners();
    this.initializePanel();
  }

  /**
   * Sets up all event listeners for user interactions and tab changes
   */
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
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        // Only process updates for our own tab
        if (tabId === this.tabId && changeInfo.status === "complete") {
          this.handleTabChange();
        }
      });
    }
  }

  /**
   * Initializes the side panel by identifying the current tab and setting up initial state
   * @returns {Promise<void>}
   */
  async initializePanel() {
    try {
      // Get the tabId from the URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tabId = urlParams.get('tabId');
      const summarize = urlParams.get('summarize');
      
      if (tabId) {
        this.tabId = parseInt(tabId, 10);
        console.log(`ErnestoSidePanel initialized for tab ${this.tabId} from URL parameter`);
      } else {
        console.error("No tabId provided in URL parameters for ErnestoSidePanel");
      }
      
      await this.summarizeOnOpen(summarize)

    } catch (error) {
      console.error("Error initializing panel:", error);
    }
    
    await this.handleTabChange();
  }

  /**
   * Handles the auto-summarize feature when opening a page
   * @param {string} summarize - String 'true' or 'false' indicating whether to auto-summarize
   * @returns {Promise<void>}
   */
  async summarizeOnOpen(summarize) {
    // Set the flag to the action that we need to take. 
    this.summarizeOnOpenFlag = summarize === 'true';

    if (!this.summarizeOnOpenFlag)
      return;  // nothing to do

    
    console.log("Triggering summarize-on-open for the current tab");

    // check first if the tab has completed loading, if it did we will issue the 
    // summarize() right now. If not, we will wait until that happens
    const currentTab = await this.getCurrentTab(this.tabId);
    if (currentTab.status === "complete") {
      this.summarizeOnOpenFlag = false;  // we can turn this flag off now
      this.summarize();
    }
    else {
      // Create a named listener function so we can remove it later
      const onTabUpdated = (tabId, changeInfo) => {
        if (tabId === this.tabId && changeInfo.status === "complete") {
          // Remove the listener to prevent it from being called again
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
          this.summarizeOnOpenFlag = false;  // we can turn this off now
          this.summarize();
        }
      };
      
      // Add the listener
      chrome.tabs.onUpdated.addListener(onTabUpdated);
    }
  }

  /**
   * Handles changes to the tab (URL changes, navigation events)
   * Updates internal state and refreshes the UI accordingly
   * @returns {Promise<void>}
   */
  async handleTabChange() {
    // extract from the tab its new url and title and update our own state
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
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

      if (this.url !== currentTab.url) {
        this.url = currentTab.url;
        this.title = currentTab.title;
        this.isLoading = false;
        this.loadingMessage = "";
      }

      await this.refreshTab();
    } catch (error) {
      console.error("Error handling tab change:", error);
      this.uiManager.showTabUnavailable();
    }
  }

  /**
   * Refreshes the side panel UI with the current tab's content
   * Loads cached summaries and conversation history for the current URL
   * @returns {Promise<void>}
   */
  async refreshTab() {
    // set sidepanel's in "show tab content" mode
    this.uiManager.showTabContent(this.title);

    // and proceed to load any content that we may have (or not) in cache into the sidepanel UI
    if (!this.url) return;
    try {
      // Clear existing content first
      this.uiManager.setSummaryText("", true);
      this.uiManager.hideSummary();
      this.uiManager.clearPromptResponses();

      // apply new color theme
      await loadAndApplyColorTheme();

      // Load cached summary if available
      const cachedSummary = await getCachedSummary(this.url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
      }

      // Load cached prompts if available
      const conversationHistory = await getCachedPrompts(this.url);

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

  /**
   * Gets the current tab information based on the stored tabId
   * @returns {Promise<chrome.tabs.Tab|null>} The tab object or null if not found
   */
  async getCurrentTab() {
    try {
      // If we have a tabId, query for that specific tab
      if (this.tabId) {
        const tab = await chrome.tabs.get(this.tabId);
        return tab;
      } else {
        // Fallback to querying for the active tab (should only happen before tabId is set)
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        return tab;
      }
    } catch (error) {
      console.error("Error getting current tab:", error);
      return null;
    }
  }

  /**
   * Gets the API key for accessing external services
   * @returns {Promise<string>} The API key
   */
  async getApiKey() {
    return await getApiKey();
  }

  /**
   * Retrieves the page content from the current tab
   * Injects content script if necessary and processes the content
   * @returns {Promise<string|null>} JSON string of processed content or null if retrieval failed
   */
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

  /**
   * Gets the URL of the current tab
   * @returns {Promise<string|null>} The current tab URL or null
   */
  async getCurrentTabUrl() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      return null;
    }

    return this.url;
  }

  /**
   * Generates a summary of the current page content using AI
   * @returns {Promise<boolean>} True if summary was successfully generated, false otherwise
   */
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

    if (!this.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      const url = this.url;
      console.log("Generating summary for:", url);

      this.uiManager.showLoading(LOADING_MESSAGES.SUMMARY);
      this.uiManager.hideSummary();

      this.isLoading = true;
      this.loadingMessage = LOADING_MESSAGES.SUMMARY;

      const apiKey = await this.getApiKey();
      const summary = await getSummary(url, apiKey, pageContent);

      await cacheSummary(url, summary);

      this.isLoading = false;

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

      this.isLoading = false;

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  /**
   * Converts the current summary to audio using speech synthesis
   * If no summary exists, it first generates one
   * @returns {Promise<boolean>} True if audio was successfully generated, false otherwise
   */
  async speechify() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      return;
    }

    if (!this.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      if (!this.uiManager.isSummaryVisible()) {
        const success = await this.summarize();
        if (!success) return;
      }

      const url = this.url;

      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        this.audioController.cleanup();
        this.audioController.setupAudio(cachedAudioData, true);
        return true;
      }

      this.uiManager.showLoading(LOADING_MESSAGES.AUDIO);

      this.isLoading = true;
      this.loadingMessage = LOADING_MESSAGES.AUDIO;

      const apiKey = await this.getApiKey();
      const summaryText = this.uiManager.getSummaryText();
      const audioBlob = await getSpeechifyAudio(summaryText, apiKey);

      // ----------------------------------------------------------------
      // temporarily disable caching of audios, we need a better solution
      // await cacheAudio(url, audioBlob);
      // ----------------------------------------------------------------

      this.audioController.setupAudio(audioBlob, true);

      this.isLoading = false;

      return true;
    } catch (error) {
      console.error("Speechify error:", error);
      this.uiManager.showError(error.message);

      this.isLoading = false;

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  /**
   * Processes a user prompt/question about the current page
   * Sends the prompt to an AI service and displays the response
   * @returns {Promise<boolean>} True if the prompt was successfully processed, false otherwise
   */
  async prompt() {
    const currentTab = await this.getCurrentTab();
    if (!currentTab) {
      this.uiManager.showTabUnavailable();
      return;
    }

    if (!this.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    // Get the prompt text
    const promptText = this.uiManager.getPromptText();
    if (!promptText.trim()) {
      return; // Skip empty prompts
    }

    try {
      const url = this.url;
      console.log("Processing prompt for:", url);

      // Clear the input field
      this.uiManager.clearPromptInput();

      this.uiManager.showLoading(LOADING_MESSAGES.PROMPT);
      this.uiManager.updateButtonStates(); // Disable buttons during loading

      this.isLoading = true;
      this.loadingMessage = LOADING_MESSAGES.PROMPT;

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

      this.isLoading = false;

      return true;
    } catch (error) {
      console.error("Prompt error:", error);
      this.uiManager.showError(error.message);

      this.isLoading = false;

      return false;
    } finally {
      this.uiManager.hideLoading();
      this.uiManager.updateButtonStates(); // Re-enable buttons after loading
    }
  }
}
