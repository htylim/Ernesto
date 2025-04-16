import { clearCache } from "./summariesCache.js";
import { clearAudioCache } from "./speechifyCache.js";
import { audioCache } from "./speechifyCache.js";
import { summariesCache } from "./summariesCache.js";
import { getApiKey, setApiKey } from "./apiKeyManager.js";
import { clearPromptsCache } from "./promptsCache.js";
import { promptsCache } from "./promptsCache.js";
import {
  getColorTheme,
  setColorTheme,
  resetToDefaultColors,
} from "./colorThemeManager.js";

// Constants
const DISPLAY_STATES = {
  VISIBLE: "block",
  HIDDEN: "none",
};

// Color utility functions
const colorUtils = {
  // Convert hex to HSL
  hexToHSL(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Parse hex values
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    // Find min and max RGB values
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    // Calculate HSL values
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    // Return HSL values as percentages
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  },

  // Convert HSL to hex
  hslToHex(h, s, l) {
    // Ensure values are in proper range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    // Convert to hex
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  },

  // Derive colors from main accent color
  deriveColors(mainAccentColor) {
    const hsl = this.hexToHSL(mainAccentColor);
    const colors = {
      mainAccentColor: mainAccentColor,
      hoverColor: "",
      disabledColor: "",
      summaryBgColor: "",
    };

    // For hover color: adjust brightness based on current brightness
    if (hsl.l > 50) {
      // For lighter colors, darken by 10%
      colors.hoverColor = this.hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 10));
    } else {
      // For darker colors, brighten by 10% and slightly increase saturation
      colors.hoverColor = this.hslToHex(
        hsl.h,
        Math.min(100, hsl.s + 5),
        Math.min(100, hsl.l + 10)
      );
    }

    // For disabled state: reduce saturation and adjust brightness
    colors.disabledColor = this.hslToHex(
      hsl.h,
      Math.max(0, hsl.s - 40),
      hsl.l > 50 ? Math.max(0, hsl.l - 15) : Math.min(100, hsl.l + 5)
    );

    // For summary background: ensure good contrast with black text while preserving color
    if (hsl.l > 80) {
      // Very bright colors - slightly darken and preserve saturation
      colors.summaryBgColor = this.hslToHex(
        hsl.h,
        Math.max(20, hsl.s - 10),
        Math.max(70, hsl.l - 5)
      );
    } else if (hsl.l > 40) {
      // Medium brightness - lighten but preserve more saturation
      colors.summaryBgColor = this.hslToHex(
        hsl.h,
        Math.max(15, hsl.s - 15),
        Math.min(90, hsl.l + 30)
      );
    } else {
      // Dark colors - lighten but preserve more of the color
      colors.summaryBgColor = this.hslToHex(
        hsl.h,
        Math.max(15, hsl.s - 25),
        Math.min(85, hsl.l + 55)
      );
    }

    return colors;
  },
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
      // Color picker elements
      mainAccentColor: document.querySelector("#mainAccentColor"),
      hoverColor: document.querySelector("#hoverColor"),
      disabledColor: document.querySelector("#disabledColor"),
      summaryBgColor: document.querySelector("#summaryBgColor"),
      saveColorsButton: document.querySelector("#saveColors"),
      resetColorsButton: document.querySelector("#resetColors"),
      syncColorsButton: document.querySelector("#syncColors"),
    };
    this.validateElements();
  }

  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.warn(`Missing some elements: ${missingElements.join(", ")}`);
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

  updateColorPickers(colors) {
    this.elements.mainAccentColor.value = colors.mainAccentColor;
    this.elements.hoverColor.value = colors.hoverColor;
    this.elements.disabledColor.value = colors.disabledColor;
    this.elements.summaryBgColor.value = colors.summaryBgColor;
  }

  getColorValues() {
    return {
      mainAccentColor: this.elements.mainAccentColor.value,
      hoverColor: this.elements.hoverColor.value,
      disabledColor: this.elements.disabledColor.value,
      summaryBgColor: this.elements.summaryBgColor.value,
    };
  }

  syncColorsFromAccent() {
    const mainAccentColor = this.elements.mainAccentColor.value;
    const derivedColors = colorUtils.deriveColors(mainAccentColor);
    this.updateColorPickers(derivedColors);
    return derivedColors;
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

// Color Manager
class ColorManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  async loadColors() {
    try {
      const colors = await getColorTheme();
      this.uiManager.updateColorPickers(colors);
    } catch (error) {
      console.error("Error loading colors:", error);
    }
  }

  async saveColors() {
    try {
      const colors = this.uiManager.getColorValues();
      await setColorTheme(colors);
      // Notify other extension components about the color change
      this.notifyColorChange(colors);
      return true;
    } catch (error) {
      console.error("Error saving colors:", error);
      return false;
    }
  }

  async resetColors() {
    try {
      const defaultColors = await resetToDefaultColors();
      this.uiManager.updateColorPickers(defaultColors);
      // Notify other extension components about the color change
      this.notifyColorChange(defaultColors);
      return true;
    } catch (error) {
      console.error("Error resetting colors:", error);
      return false;
    }
  }

  syncColors() {
    try {
      const derivedColors = this.uiManager.syncColorsFromAccent();
      return derivedColors;
    } catch (error) {
      console.error("Error syncing colors:", error);
      return null;
    }
  }

  // Notify other parts of the extension about color changes
  notifyColorChange(colors) {
    try {
      chrome.runtime.sendMessage({
        action: "colorThemeChanged",
        colors: colors,
      });
    } catch (error) {
      console.error("Error notifying about color change:", error);
    }
  }
}

// Options Page Controller
class OptionsPageController {
  constructor() {
    this.uiManager = new UIStateManager();
    this.cacheManager = new CacheManager(this.uiManager);
    this.colorManager = new ColorManager(this.uiManager);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const {
      saveButton,
      cancelButton,
      purgeCacheButton,
      purgeAudioCacheButton,
      purgePromptsCacheButton,
      mainAccentColor,
      hoverColor,
      disabledColor,
      summaryBgColor,
      saveColorsButton,
      resetColorsButton,
      syncColorsButton,
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

    // Color picker events
    [mainAccentColor, hoverColor, disabledColor, summaryBgColor].forEach(
      (element) => {
        if (element) {
          element.addEventListener("input", () =>
            this.uiManager.updateColorPreviews()
          );
        }
      }
    );

    if (saveColorsButton) {
      saveColorsButton.addEventListener("click", async () => {
        const success = await this.colorManager.saveColors();
        if (!success) {
          alert("Error applying colors. Please try again.");
        }
      });
    }

    if (resetColorsButton) {
      resetColorsButton.addEventListener("click", async () => {
        const success = await this.colorManager.resetColors();
        if (success) {
          alert("Colors reset to default!");
        } else {
          alert("Error resetting colors. Please try again.");
        }
      });
    }

    if (syncColorsButton) {
      syncColorsButton.addEventListener("click", () => {
        this.colorManager.syncColors();
      });
    }
  }

  async init() {
    try {
      await Promise.all([
        this.loadApiKey(),
        this.cacheManager.updateCacheSizes(),
        this.colorManager.loadColors(),
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
