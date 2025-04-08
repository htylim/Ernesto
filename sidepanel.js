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

// Tab state storage
class TabStateManager {
  constructor() {
    this.tabStates = new Map();
    this.currentTabId = null;
  }

  async getCurrentTabId() {
    if (!chrome.tabs) {
      console.error("Chrome tabs API is not available");
      return null;
    }

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs && tabs.length > 0) {
        return tabs[0].id;
      }
      return null;
    } catch (error) {
      console.error("Error getting current tab:", error);
      return null;
    }
  }

  async getState() {
    try {
      const tabId = await this.getCurrentTabId();
      if (!tabId) return null;

      this.currentTabId = tabId;

      if (!this.tabStates.has(tabId)) {
        this.tabStates.set(tabId, {
          url: null,
          title: null,
          summary: null,
          audioBlob: null,
          isLoading: false,
          loadingMessage: "",
        });
      }

      return this.tabStates.get(tabId);
    } catch (error) {
      console.error("Error getting tab state:", error);
      return null;
    }
  }

  async updateState(updates) {
    try {
      const tabId = this.currentTabId;
      if (!tabId) return;

      const currentState = this.tabStates.get(tabId) || {};
      this.tabStates.set(tabId, { ...currentState, ...updates });
    } catch (error) {
      console.error("Error updating tab state:", error);
    }
  }
}

// UI State Manager
class UIStateManager {
  constructor() {
    this.elements = {
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

  showLoading(message) {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.elements.loadingText.textContent = message;
    this.updateButtonStates();
  }

  hideLoading() {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.updateButtonStates();
  }

  showSummary(summary) {
    this.elements.summaryDiv.innerHTML = summary;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  showError(message) {
    this.elements.summaryDiv.textContent = `Error: ${message}`;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  updateButtonStates() {
    const isRequestOngoing =
      this.elements.loadingDiv.style.display === DISPLAY_STATES.VISIBLE;
    const hasSummary =
      this.elements.summaryDiv.style.display === DISPLAY_STATES.VISIBLE;

    this.elements.summarizeBtn.disabled = hasSummary || isRequestOngoing;
    this.elements.speechifyBtn.disabled = isRequestOngoing;
  }

  showTabContent(tab) {
    this.elements.tabContent.style.display = DISPLAY_STATES.VISIBLE;
    this.elements.tabUnavailable.style.display = DISPLAY_STATES.HIDDEN;

    if (tab?.title) {
      this.elements.pageTitle.textContent = tab.title;
    } else {
      this.elements.pageTitle.textContent = "Current Page";
    }
  }

  showTabUnavailable() {
    this.elements.tabContent.style.display = DISPLAY_STATES.HIDDEN;
    this.elements.tabUnavailable.style.display = DISPLAY_STATES.VISIBLE;
  }

  resetUI() {
    this.elements.summaryDiv.innerHTML = "";
    this.elements.summaryDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.elements.loadingDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.updateButtonStates();
  }
}

// Audio Controller
class AudioController {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.audioElement = null;
    this.setupEventListeners();
    this.showAudioPlayer();
  }

  setupEventListeners() {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    playAudioBtn.addEventListener("click", () => this.play());
    pauseAudioBtn.addEventListener("click", () => this.pause());
    restartAudioBtn.addEventListener("click", () => this.restart());
  }

  showAudioPlayer() {
    const { audioPlayer, playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;
    audioPlayer.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates(false);
  }

  updateButtonStates(hasAudio) {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;
    playAudioBtn.disabled = !hasAudio;
    pauseAudioBtn.disabled = true;
    restartAudioBtn.disabled = !hasAudio;
  }

  play() {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  restart() {
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play();
    }
  }

  setupAudio(audioBlob, autoPlay = false) {
    if (this.audioElement) {
      this.cleanup();
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    this.audioElement = new Audio(audioUrl);

    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    this.audioElement.addEventListener("play", () => {
      playAudioBtn.disabled = true;
      pauseAudioBtn.disabled = false;
      restartAudioBtn.disabled = false;
    });

    this.audioElement.addEventListener("pause", () => {
      playAudioBtn.disabled = false;
      pauseAudioBtn.disabled = true;
      restartAudioBtn.disabled = false;
    });

    this.audioElement.addEventListener("ended", () => {
      playAudioBtn.disabled = false;
      pauseAudioBtn.disabled = true;
      restartAudioBtn.disabled = false;
    });

    this.updateButtonStates(true);

    if (autoPlay) {
      this.audioElement.play();
    }
  }

  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement.src = "";
      this.audioElement = null;
    }
    this.updateButtonStates(false);
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
    const tabState = await this.tabStateManager.getState();
    if (!tabState) {
      this.uiManager.showTabUnavailable();
      this.audioController.cleanup();
      return;
    }

    try {
      const currentTab = await this.getCurrentTab();

      if (
        !currentTab ||
        !currentTab.url ||
        currentTab.url.startsWith("chrome://")
      ) {
        this.uiManager.showTabUnavailable();
        this.audioController.cleanup();
        return;
      }

      // Reset UI if URL changed
      if (tabState.url !== currentTab.url) {
        this.uiManager.resetUI();
        this.audioController.cleanup();

        await this.tabStateManager.updateState({
          url: currentTab.url,
          title: currentTab.title,
          summary: null,
          audioBlob: null,
        });
      }

      this.uiManager.showTabContent(currentTab);

      // Restore state from cache if available
      this.restoreTabState();
    } catch (error) {
      console.error("Error handling tab change:", error);
      this.uiManager.showTabUnavailable();
    }
  }

  async restoreTabState() {
    const tabState = await this.tabStateManager.getState();
    if (!tabState || !tabState.url) return;

    try {
      // Check for cached summary
      const cachedSummary = await getCachedSummary(tabState.url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
        await this.tabStateManager.updateState({ summary: cachedSummary });
      }

      // Check for cached audio
      const cachedAudioData = await getCachedAudio(tabState.url);
      if (cachedAudioData && cachedSummary) {
        this.audioController.setupAudio(cachedAudioData, false);
        await this.tabStateManager.updateState({ audioBlob: cachedAudioData });
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
    const tabState = await this.tabStateManager.getState();
    if (!tabState || !tabState.url) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      const url = tabState.url;
      console.log("Generating summary for:", url);

      this.uiManager.showLoading(LOADING_MESSAGES.SUMMARY);
      this.uiManager.elements.summaryDiv.style.display = DISPLAY_STATES.HIDDEN;

      await this.tabStateManager.updateState({
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.SUMMARY,
      });

      const apiKey = await this.getApiKey();
      const summary = await getSummary(url, apiKey);

      await cacheSummary(url, summary);
      this.uiManager.showSummary(summary);

      await this.tabStateManager.updateState({
        summary: summary,
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Summarization error:", error);
      this.uiManager.showError(error.message);

      await this.tabStateManager.updateState({
        isLoading: false,
      });

      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  async speechify() {
    const tabState = await this.tabStateManager.getState();
    if (!tabState) {
      this.uiManager.showTabUnavailable();
      return;
    }

    try {
      // Check if we need to generate a summary first
      if (
        !tabState.summary ||
        this.uiManager.elements.summaryDiv.style.display !==
          DISPLAY_STATES.VISIBLE
      ) {
        const success = await this.summarize();
        if (!success) return;
      }

      const url = tabState.url;

      // Check if audio is already in cache
      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        this.audioController.cleanup();
        this.audioController.setupAudio(cachedAudioData, true);
        return true;
      }

      // If not in cache, generate new audio
      this.uiManager.showLoading(LOADING_MESSAGES.AUDIO);

      await this.tabStateManager.updateState({
        isLoading: true,
        loadingMessage: LOADING_MESSAGES.AUDIO,
      });

      const apiKey = await this.getApiKey();
      const summaryText = this.uiManager.elements.summaryDiv.textContent;
      const audioBlob = await getSpeechifyAudio(summaryText, apiKey);

      await cacheAudio(url, audioBlob);
      this.audioController.setupAudio(audioBlob, true);

      await this.tabStateManager.updateState({
        audioBlob: audioBlob,
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Speechify error:", error);
      this.uiManager.showError(error.message);

      await this.tabStateManager.updateState({
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
