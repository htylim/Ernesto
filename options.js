import { clearCache } from "./summariesCache.js";
import { clearAudioCache } from "./speechifyCache.js";
import { audioCache } from "./speechifyCache.js";
import { summariesCache } from "./summariesCache.js";

// Constants
const DISPLAY_STATES = {
  VISIBLE: "block",
  HIDDEN: "none",
};

// UI State Manager
class UIStateManager {
  constructor() {
    this.elements = {
      apiKeyInput: document.querySelector("#apiKey"),
      saveButton: document.querySelector("#save"),
      cancelButton: document.querySelector("#cancel"),
      purgeCacheButton: document.querySelector("#purgeCache"),
      purgeAudioCacheButton: document.querySelector("#purgeAudioCache"),
      purgeStatus: document.querySelector("#purgeStatus"),
      purgeAudioStatus: document.querySelector("#purgeAudioStatus"),
      summariesSize: document.querySelector("#summariesSize"),
      audioSize: document.querySelector("#audioSize"),
    };
    this.validateElements();
  }

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

  setApiKey(key) {
    this.elements.apiKeyInput.value = key;
  }

  getApiKey() {
    return this.elements.apiKeyInput.value;
  }

  updateCacheSizes(summariesBytes, audioBytes) {
    this.elements.summariesSize.textContent = this.formatBytes(summariesBytes);
    this.elements.audioSize.textContent = this.formatBytes(audioBytes);
  }

  setPurgeStatus(status, isAudio = false) {
    const element = isAudio
      ? this.elements.purgeAudioStatus
      : this.elements.purgeStatus;
    element.textContent = status;
  }

  setButtonDisabled(buttonName, disabled) {
    const button = this.elements[buttonName];
    if (button) {
      button.disabled = disabled;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Cache Manager
class CacheManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  async updateCacheSizes() {
    try {
      const [summariesBytes, audioBytes] = await Promise.all([
        summariesCache.getCacheSize(),
        audioCache.getCacheSize(),
      ]);
      this.uiManager.updateCacheSizes(summariesBytes, audioBytes);
    } catch (error) {
      console.error("Error updating cache sizes:", error);
    }
  }

  async purgeCache(purgeSummaries = false, purgeAudio = false) {
    if (!purgeSummaries && !purgeAudio) return;

    const operations = [];
    const statuses = [];

    if (purgeSummaries) {
      operations.push(clearCache());
      statuses.push({
        buttonName: "purgeCacheButton",
        statusPrefix: "Summaries",
        isAudio: false,
      });
    }

    if (purgeAudio) {
      operations.push(clearAudioCache());
      statuses.push({
        buttonName: "purgeAudioCacheButton",
        statusPrefix: "Audio",
        isAudio: true,
      });
    }

    try {
      // Disable buttons and set initial status
      statuses.forEach(({ buttonName, statusPrefix, isAudio }) => {
        this.uiManager.setButtonDisabled(buttonName, true);
        this.uiManager.setPurgeStatus(
          `Purging ${statusPrefix.toLowerCase()} cache...`,
          isAudio
        );
      });

      // Execute all purge operations
      await Promise.all(operations);
      await this.updateCacheSizes();

      // Update status for each operation
      statuses.forEach(({ buttonName, statusPrefix, isAudio }) => {
        this.uiManager.setPurgeStatus(
          `${statusPrefix} cache purged successfully!`,
          isAudio
        );
        setTimeout(() => {
          this.uiManager.setPurgeStatus("", isAudio);
          this.uiManager.setButtonDisabled(buttonName, false);
        }, 2000);
      });
    } catch (error) {
      console.error("Error purging caches:", error);
      statuses.forEach(({ buttonName, statusPrefix, isAudio }) => {
        this.uiManager.setPurgeStatus(
          `Error purging ${statusPrefix.toLowerCase()} cache. Please try again.`,
          isAudio
        );
        this.uiManager.setButtonDisabled(buttonName, false);
      });
    }
  }
}

// Options Page Controller
class OptionsPageController {
  constructor() {
    this.uiManager = new UIStateManager();
    this.cacheManager = new CacheManager(this.uiManager);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const {
      saveButton,
      cancelButton,
      purgeCacheButton,
      purgeAudioCacheButton,
    } = this.uiManager.elements;

    saveButton.addEventListener("click", () => this.handleSave());
    cancelButton.addEventListener("click", () => this.handleCancel());
    purgeCacheButton.addEventListener("click", () =>
      this.cacheManager.purgeCache(true, false)
    );
    purgeAudioCacheButton.addEventListener("click", () =>
      this.cacheManager.purgeCache(false, true)
    );
  }

  async init() {
    try {
      await Promise.all([
        this.loadApiKey(),
        this.cacheManager.updateCacheSizes(),
      ]);
    } catch (error) {
      console.error("Error initializing options page:", error);
    }
  }

  async loadApiKey() {
    try {
      const result = await chrome.storage.local.get(["openaiApiKey"]);
      if (result.openaiApiKey) {
        this.uiManager.setApiKey(result.openaiApiKey);
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  }

  handleSave() {
    chrome.storage.local.set(
      { openaiApiKey: this.uiManager.getApiKey() },
      () => {
        window.close();
      }
    );
  }

  handleCancel() {
    window.close();
  }
}

// Initialize the options page when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const optionsPage = new OptionsPageController();
    await optionsPage.init();
  } catch (error) {
    console.error("Error initializing options page:", error);
  }
});
