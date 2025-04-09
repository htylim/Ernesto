import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { getSpeechifyAudio } from "./getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "./speechifyCache.js";
import { getApiKey } from "./apiKeyManager.js";
import { TabStateManager } from "./tabStateManager.js";
import { UIStateManager } from "./uiStateManager.js";
import { AudioController } from "./audioController.js";

const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
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
}
