import { clearCache } from "./summariesCache.js";
import { clearAudioCache } from "./speechifyCache.js";
import { audioCache } from "./speechifyCache.js";
import { summariesCache } from "./summariesCache.js";
import { getApiKey, setApiKey } from "./apiKeyManager.js";
import { clearPromptsCache } from "./promptsCache.js";
import { promptsCache } from "./promptsCache.js";

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
      purgePromptsCacheButton: document.querySelector("#purgePromptsCache"),
      purgeStatus: document.querySelector("#purgeStatus"),
      purgeAudioStatus: document.querySelector("#purgeAudioStatus"),
      purgePromptsStatus: document.querySelector("#purgePromptsStatus"),
      summariesSize: document.querySelector("#summariesSize"),
      audioSize: document.querySelector("#audioSize"),
      promptsSize: document.querySelector("#promptsSize"),
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

  updateCacheSizes(summariesBytes, audioBytes, promptsBytes) {
    this.elements.summariesSize.textContent = this.formatBytes(summariesBytes);
    this.elements.audioSize.textContent = this.formatBytes(audioBytes);
    if (this.elements.promptsSize) {
      this.elements.promptsSize.textContent = this.formatBytes(promptsBytes);
    }
  }

  setPurgeStatus(status, isAudio = false, isPrompts = false) {
    const element = isAudio
      ? this.elements.purgeAudioStatus
      : isPrompts
      ? this.elements.purgePromptsStatus
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
      const [summariesBytes, audioBytes, promptsBytes] = await Promise.all([
        summariesCache.getCacheSize(),
        audioCache.getCacheSize(),
        promptsCache.getCacheSize(),
      ]);
      this.uiManager.updateCacheSizes(summariesBytes, audioBytes, promptsBytes);
    } catch (error) {
      console.error("Error updating cache sizes:", error);
    }
  }

  async purgeCache(
    purgeSummaries = false,
    purgeAudio = false,
    purgePrompts = false
  ) {
    if (!purgeSummaries && !purgeAudio && !purgePrompts) return;

    const operations = [];
    const statuses = [];

    if (purgeSummaries) {
      operations.push(clearCache());
      statuses.push({
        buttonName: "purgeCacheButton",
        statusPrefix: "Summaries",
        isAudio: false,
        isPrompts: false,
      });
    }

    if (purgeAudio) {
      operations.push(clearAudioCache());
      statuses.push({
        buttonName: "purgeAudioCacheButton",
        statusPrefix: "Audio",
        isAudio: true,
        isPrompts: false,
      });
    }

    if (purgePrompts) {
      operations.push(clearPromptsCache());
      statuses.push({
        buttonName: "purgePromptsCacheButton",
        statusPrefix: "Prompts",
        isAudio: false,
        isPrompts: true,
      });
    }

    try {
      // Disable buttons and set initial status
      statuses.forEach(({ buttonName, statusPrefix, isAudio, isPrompts }) => {
        this.uiManager.setButtonDisabled(buttonName, true);
        this.uiManager.setPurgeStatus(
          `Purging ${statusPrefix.toLowerCase()} cache...`,
          isAudio,
          isPrompts
        );
      });

      // Execute all purge operations
      await Promise.all(operations);
      await this.updateCacheSizes();

      // Update status for each operation
      statuses.forEach(({ buttonName, statusPrefix, isAudio, isPrompts }) => {
        this.uiManager.setPurgeStatus(
          `${statusPrefix} cache purged successfully!`,
          isAudio,
          isPrompts
        );
        setTimeout(() => {
          this.uiManager.setPurgeStatus("", isAudio, isPrompts);
          this.uiManager.setButtonDisabled(buttonName, false);
        }, 2000);
      });
    } catch (error) {
      console.error("Error purging caches:", error);
      statuses.forEach(({ buttonName, statusPrefix, isAudio, isPrompts }) => {
        this.uiManager.setPurgeStatus(
          `Error purging ${statusPrefix.toLowerCase()} cache. Please try again.`,
          isAudio,
          isPrompts
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
      purgePromptsCacheButton,
    } = this.uiManager.elements;

    saveButton.addEventListener("click", () => this.handleSave());
    cancelButton.addEventListener("click", () => this.handleCancel());
    purgeCacheButton.addEventListener("click", () =>
      this.cacheManager.purgeCache(true, false, false)
    );
    purgeAudioCacheButton.addEventListener("click", () =>
      this.cacheManager.purgeCache(false, true, false)
    );
    if (purgePromptsCacheButton) {
      purgePromptsCacheButton.addEventListener("click", () =>
        this.cacheManager.purgeCache(false, false, true)
      );
    }
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
      const apiKey = await getApiKey();
      this.uiManager.setApiKey(apiKey);
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  }

  async handleSave() {
    try {
      const apiKey = this.uiManager.getApiKey();
      await setApiKey(apiKey);
      window.close();
    } catch (error) {
      console.error("Error saving API key:", error);
      alert("Error saving API key. Please try again.");
    }
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
