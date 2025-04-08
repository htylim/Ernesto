import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { getSpeechifyAudio } from "./getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "./speechifyCache.js";
import { getApiKey } from "./apiKeyManager.js";

// Constants
const DISPLAY_STATES = {
  VISIBLE: "block",
  HIDDEN: "none",
};

const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
};

/**
 * @typedef {Object} TabState
 * @property {string|null} url - Current tab URL
 * @property {string|null} title - Current tab title
 * @property {boolean} isLoading - Loading state
 * @property {string} loadingMessage - Current loading message
 */

/**
 * Manages the state for each tab in the extension
 * @class
 */
class TabStateManager {
  constructor() {
    this.tabStates = new Map();
  }

  /**
   * Gets the current active tab ID
   * @returns {Promise<number|null>} Tab ID or null if not available
   */
  async getCurrentTabId() {
    if (!chrome.tabs) {
      console.error("Chrome tabs API is not available");
      return null;
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tab?.id ?? null;
    } catch (error) {
      console.error("Error getting current tab:", error);
      return null;
    }
  }

  /**
   * Gets or initializes state for a tab
   * @param {number} tabId - Tab ID to get state for
   * @returns {TabState} Tab state object
   */
  getTabState(tabId) {
    if (!this.tabStates.has(tabId)) {
      this.tabStates.set(tabId, {
        url: null,
        title: null,
        isLoading: false,
        loadingMessage: "",
      });
    }
    return this.tabStates.get(tabId);
  }

  /**
   * Updates state for a specific tab
   * @param {number} tabId - Tab ID to update
   * @param {Partial<TabState>} updates - State updates to apply
   */
  async updateTabState(tabId, updates) {
    const currentState = this.getTabState(tabId);
    this.tabStates.set(tabId, { ...currentState, ...updates });
  }
}

/**
 * Manages the UI state and interactions for the extension's side panel
 * @class
 */
class UIStateManager {
  constructor() {
    this.elements = this.initializeElements();
    this.validateElements();
  }

  /**
   * Initializes references to DOM elements
   * @private
   * @returns {Object} Object containing DOM element references
   */
  initializeElements() {
    return {
      summarizeBtn: document.getElementById("summarize"),
      openOptionsBtn: document.getElementById("openOptions"),
      closeBtn: document.getElementById("closePanel"),
      speechifyBtn: document.getElementById("speechify"),
      loadingDiv: document.getElementById("loading"),
      summaryDiv: document.getElementById("summary"),
      audioPlayer: document.getElementById("audioPlayer"),
      playAudioBtn: document.getElementById("playAudio"),
      pauseAudioBtn: document.getElementById("pauseAudio"),
      restartAudioBtn: document.getElementById("restartAudio"),
      loadingText: document.getElementById("loadingText"),
      pageTitle: document.getElementById("page-title"),
      tabContent: document.getElementById("tab-content"),
      tabUnavailable: document.getElementById("tab-unavailable"),
    };
  }

  /**
   * Validates that all required elements are present
   * @private
   * @throws {Error} If any required element is missing
   */
  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      throw new Error(
        `Missing required elements: ${missingElements.join(", ")}`
      );
    }
  }

  /**
   * Shows loading state with specified message
   * @param {string} message - Loading message to display
   */
  showLoading(message) {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.elements.loadingText.textContent = message;
    this.updateButtonStates();
  }

  /**
   * Hides loading state
   */
  hideLoading() {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.updateButtonStates();
  }

  /**
   * Shows summary content
   * @param {string} summary - HTML content of the summary
   */
  showSummary(summary) {
    this.elements.summaryDiv.innerHTML = summary;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  /**
   * Shows error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.elements.summaryDiv.textContent = `Error: ${message}`;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  /**
   * Updates button states based on current UI state
   * @private
   */
  updateButtonStates() {
    const isRequestOngoing =
      this.elements.loadingDiv.style.display === DISPLAY_STATES.VISIBLE;
    const hasSummary =
      this.elements.summaryDiv.style.display === DISPLAY_STATES.VISIBLE;

    this.elements.summarizeBtn.disabled = hasSummary || isRequestOngoing;
    this.elements.speechifyBtn.disabled = isRequestOngoing;
  }

  /**
   * Shows tab content
   * @param {Object} tab - Tab object containing title
   */
  showTabContent(tab) {
    this.elements.tabContent.style.display = DISPLAY_STATES.VISIBLE;
    this.elements.tabUnavailable.style.display = DISPLAY_STATES.HIDDEN;
    this.elements.pageTitle.textContent = tab?.title || "Current Page";
  }

  /**
   * Shows tab unavailable message
   */
  showTabUnavailable() {
    this.elements.tabContent.style.display = DISPLAY_STATES.HIDDEN;
    this.elements.tabUnavailable.style.display = DISPLAY_STATES.VISIBLE;
  }

  /**
   * Resets UI to initial state
   */
  resetUI() {
    this.elements.summaryDiv.innerHTML = "";
    this.elements.summaryDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.elements.loadingDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.updateButtonStates();
  }
}

/**
 * Controls audio playback functionality
 * @class
 */
class AudioController {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.audioElement = null;
    this.setupEventListeners();
    this.showAudioPlayer();
  }

  /**
   * Sets up all audio-related event listeners
   * @private
   */
  setupEventListeners() {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    // Button click handlers
    const handlers = {
      play: () => this.play(),
      pause: () => this.pause(),
      restart: () => this.restart(),
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      this.uiManager.elements[`${action}AudioBtn`].addEventListener(
        "click",
        handler
      );
    });
  }

  /**
   * Sets up audio element event listeners
   * @private
   */
  setupAudioElementListeners() {
    if (!this.audioElement) return;

    const events = {
      play: () => this.updateButtonStates({ playing: true }),
      pause: () => this.updateButtonStates({ playing: false }),
      ended: () => this.updateButtonStates({ playing: false }),
    };

    Object.entries(events).forEach(([event, handler]) => {
      this.audioElement.addEventListener(event, handler);
    });
  }

  /**
   * Shows the audio player UI
   * @private
   */
  showAudioPlayer() {
    const { audioPlayer } = this.uiManager.elements;
    audioPlayer.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates({ playing: false });
  }

  /**
   * Updates button states based on audio player state
   * @param {Object} state - Current audio player state
   * @param {boolean} state.playing - Whether audio is playing
   * @private
   */
  updateButtonStates({ playing }) {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    playAudioBtn.disabled = playing;
    pauseAudioBtn.disabled = !playing;
    restartAudioBtn.disabled = !this.audioElement;
  }

  /**
   * Plays the audio
   */
  play() {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  /**
   * Pauses the audio
   */
  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Restarts the audio
   */
  restart() {
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play();
    }
  }

  /**
   * Sets up audio with the provided blob
   * @param {Blob} audioBlob - Audio data blob
   * @param {boolean} [autoPlay=false] - Whether to autoplay the audio
   */
  setupAudio(audioBlob, autoPlay = false) {
    if (this.audioElement) {
      this.cleanup();
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    this.audioElement = new Audio(audioUrl);
    this.setupAudioElementListeners();
    this.updateButtonStates({ playing: false });

    if (autoPlay) {
      this.audioElement.play();
    }
  }

  /**
   * Cleans up audio resources
   */
  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
      this.updateButtonStates({ playing: false });
    }
  }
}

// Main application
class SummarizerApp {
  constructor() {
    this.uiManager = new UIStateManager();
    this.audioController = new AudioController(this.uiManager);
    this.tabStateManager = new TabStateManager();
    this.setupEventListeners();
    this.initializePanel();
  }

  setupEventListeners() {
    const { summarizeBtn, speechifyBtn, openOptionsBtn, closeBtn } =
      this.uiManager.elements;

    summarizeBtn.addEventListener("click", () => this.summarize());
    speechifyBtn.addEventListener("click", () => this.speechify());
    openOptionsBtn.addEventListener("click", () =>
      chrome.runtime.openOptionsPage()
    );
    closeBtn.addEventListener("click", () => {
      window.close();
    });

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
      const cachedSummary = await getCachedSummary(tabState.url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
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
      this.uiManager.elements.summaryDiv.style.display = DISPLAY_STATES.HIDDEN;

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
      if (
        !this.uiManager.elements.summaryDiv.textContent ||
        this.uiManager.elements.summaryDiv.style.display !==
          DISPLAY_STATES.VISIBLE
      ) {
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
      const summaryText = this.uiManager.elements.summaryDiv.textContent;
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
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  try {
    new SummarizerApp();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});
