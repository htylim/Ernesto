import { clearCache } from "../common/cache/summariesCache.js";
import { clearAudioCache } from "../common/cache/speechifyCache.js";
import { audioCache } from "../common/cache/speechifyCache.js";
import { summariesCache } from "../common/cache/summariesCache.js";
import { getApiKey, setApiKey } from "../common/managers/apiKeyManager.js";
import { clearPromptsCache } from "../common/cache/promptsCache.js";
import { promptsCache } from "../common/cache/promptsCache.js";
import {
  getDomainThemesStructure,
  getDefaultColorTheme,
  setDefaultColorTheme,
  setDomainColorTheme,
  removeDomainColorTheme,
  resetDefaultColorTheme,
  applyColorTheme,
  DEFAULT_COLORS,
} from "../common/managers/colorThemeManager.js";

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
      mainAccentColor: document.querySelector("#mainAccentColor"),
      hoverColor: document.querySelector("#hoverColor"),
      disabledColor: document.querySelector("#disabledColor"),
      summaryBgColor: document.querySelector("#summaryBgColor"),
      saveDefaultThemeButton: document.querySelector("#saveDefaultTheme"),
      resetDefaultThemeButton: document.querySelector("#resetDefaultTheme"),
      syncColorsButton: document.querySelector("#syncColors"),
      domainThemesList: document.querySelector("#domain-themes-list"),
      domainNameInput: document.querySelector("#domainName"),
      editingDomainNameHidden: document.querySelector("#editingDomainName"),
      domainMainAccentColor: document.querySelector("#domainMainAccentColor"),
      domainHoverColor: document.querySelector("#domainHoverColor"),
      domainDisabledColor: document.querySelector("#domainDisabledColor"),
      domainSummaryBgColor: document.querySelector("#domainSummaryBgColor"),
      saveDomainThemeButton: document.querySelector("#saveDomainTheme"),
      cancelEditDomainThemeButton: document.querySelector(
        "#cancelEditDomainTheme"
      ),
      syncDomainColorsButton: document.querySelector("#syncDomainColors"),
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

  updateDefaultColorPickers(colors) {
    this.elements.mainAccentColor.value = colors.mainAccentColor;
    this.elements.hoverColor.value = colors.hoverColor;
    this.elements.disabledColor.value = colors.disabledColor;
    this.elements.summaryBgColor.value = colors.summaryBgColor;
  }

  getDefaultColorValues() {
    return {
      mainAccentColor: this.elements.mainAccentColor.value,
      hoverColor: this.elements.hoverColor.value,
      disabledColor: this.elements.disabledColor.value,
      summaryBgColor: this.elements.summaryBgColor.value,
    };
  }

  updateDomainColorPickers(colors) {
    this.elements.domainMainAccentColor.value = colors.mainAccentColor;
    this.elements.domainHoverColor.value = colors.hoverColor;
    this.elements.domainDisabledColor.value = colors.disabledColor;
    this.elements.domainSummaryBgColor.value = colors.summaryBgColor;
  }

  getDomainColorValues() {
    return {
      mainAccentColor: this.elements.domainMainAccentColor.value,
      hoverColor: this.elements.domainHoverColor.value,
      disabledColor: this.elements.domainDisabledColor.value,
      summaryBgColor: this.elements.domainSummaryBgColor.value,
    };
  }

  getDomainNameValue() {
    return this.elements.domainNameInput.value.trim().toLowerCase();
  }

  setDomainNameValue(domain) {
    this.elements.domainNameInput.value = domain;
  }

  getEditingDomainName() {
    return this.elements.editingDomainNameHidden.value;
  }

  setEditingDomainName(domain) {
    this.elements.editingDomainNameHidden.value = domain;
  }

  resetDomainForm(useDefaults = false) {
    this.setDomainNameValue("");
    this.setEditingDomainName("");
    const colorsToSet = useDefaults
      ? DEFAULT_COLORS
      : this.getDomainColorValues();
    this.updateDomainColorPickers(colorsToSet);
    this.elements.cancelEditDomainThemeButton.classList.add("hidden");
    this.elements.domainNameInput.disabled = false;
  }

  prepareDomainFormForEdit(domain, colors) {
    this.setDomainNameValue(domain);
    this.setEditingDomainName(domain);
    this.updateDomainColorPickers(colors);
    this.elements.cancelEditDomainThemeButton.classList.remove("hidden");
    this.elements.domainNameInput.focus();
  }

  renderDomainThemesList(domains, editCallback, deleteCallback) {
    this.elements.domainThemesList.innerHTML = "";
    const sortedDomains = Object.keys(domains).sort();

    if (sortedDomains.length === 0) {
      this.elements.domainThemesList.innerHTML = `<p>No domain-specific themes configured yet.</p>`;
      return;
    }

    sortedDomains.forEach((domain) => {
      const theme = domains[domain];
      const listItem = document.createElement("div");
      listItem.classList.add("domain-theme-list-item");
      listItem.dataset.domain = domain;

      const domainInfo = document.createElement("span");
      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "15px";
      swatch.style.height = "15px";
      swatch.style.backgroundColor = theme.mainAccentColor;
      swatch.style.marginRight = "8px";
      swatch.style.border = "1px solid #ccc";
      domainInfo.appendChild(swatch);
      domainInfo.appendChild(document.createTextNode(domain));
      listItem.appendChild(domainInfo);

      const actions = document.createElement("div");
      actions.classList.add("domain-theme-actions");

      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.onclick = () => editCallback(domain, theme);
      actions.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("danger-button");
      deleteButton.onclick = () => deleteCallback(domain);
      actions.appendChild(deleteButton);

      listItem.appendChild(actions);
      this.elements.domainThemesList.appendChild(listItem);
    });
  }

  syncColorsFromAccent() {
    const mainAccentColor = this.elements.mainAccentColor.value;
    const derivedColors = colorUtils.deriveColors(mainAccentColor);
    this.updateDefaultColorPickers(derivedColors);
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
      statuses.forEach(({ buttonName, statusPrefix, isAudio, isPrompts }) => {
        this.uiManager.setButtonDisabled(buttonName, true);
        this.uiManager.setPurgeStatus(
          `Purging ${statusPrefix.toLowerCase()} cache...`,
          isAudio,
          isPrompts
        );
      });

      await Promise.all(operations);
      await this.updateCacheSizes();

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
    this.currentThemes = { default: DEFAULT_COLORS, domains: {} };
  }

  async loadThemes() {
    try {
      this.currentThemes = await getDomainThemesStructure();
      this.uiManager.updateDefaultColorPickers(this.currentThemes.default);
      this.uiManager.renderDomainThemesList(
        this.currentThemes.domains,
        this.handleEditDomain.bind(this),
        this.handleDeleteDomain.bind(this)
      );
      this.uiManager.resetDomainForm(true);
    } catch (error) {
      console.error("Error loading themes:", error);
    }
  }

  async saveDefaultTheme() {
    try {
      const colors = this.uiManager.getDefaultColorValues();
      await setDefaultColorTheme(colors);
      this.currentThemes.default = colors;
      this.notifyColorChange();
      console.log("Default theme saved.");
      return true;
    } catch (error) {
      console.error("Error saving default theme:", error);
      alert("Error saving default theme.");
      return false;
    }
  }

  async resetDefaultTheme() {
    if (
      !confirm(
        "Are you sure you want to reset the default theme to its original colors?"
      )
    ) {
      return false;
    }
    try {
      const defaultColors = await resetDefaultColorTheme();
      this.currentThemes.default = defaultColors;
      this.uiManager.updateDefaultColorPickers(defaultColors);
      this.notifyColorChange();
      console.log("Default theme reset.");
      return true;
    } catch (error) {
      console.error("Error resetting default theme:", error);
      alert("Error resetting default theme.");
      return false;
    }
  }

  async saveDomainTheme() {
    const newDomain = this.uiManager.getDomainNameValue();
    const originalDomain = this.uiManager.getEditingDomainName();
    const isEditing = !!originalDomain;
    const isRenaming = isEditing && originalDomain !== newDomain;

    if (!newDomain) {
      alert("Please enter a domain name.");
      return false;
    }
    // Basic validation: check if it looks like a domain
    if (!newDomain.includes(".")) {
      alert("Please enter a valid domain name (e.g., example.com).");
      return false;
    }

    // Check if the target domain name already exists (and isn't the original name)
    if (this.currentThemes.domains[newDomain] && newDomain !== originalDomain) {
      if (!confirm(`A theme already exists for ${newDomain}. Overwrite it?`)) {
        return false;
      }
      // If overwriting, we might need to handle removing the existing theme for newDomain
      // Although setDomainColorTheme will just overwrite it anyway.
    }

    try {
      const colors = this.uiManager.getDomainColorValues();

      // If renaming, remove the old domain entry first
      if (isRenaming) {
        console.log(`Renaming theme from ${originalDomain} to ${newDomain}`);
        await removeDomainColorTheme(originalDomain);
        delete this.currentThemes.domains[originalDomain]; // Update local cache immediately
      }

      // Save the theme under the new/current domain name
      await setDomainColorTheme(newDomain, colors);
      this.currentThemes.domains[newDomain] = colors; // Update local cache

      // Re-render the list and reset the form
      this.uiManager.renderDomainThemesList(
        this.currentThemes.domains,
        this.handleEditDomain.bind(this),
        this.handleDeleteDomain.bind(this)
      );
      this.uiManager.resetDomainForm(true); // Reset form after saving
      console.log(`Theme for ${newDomain} saved.`); // Optional console log
      this.notifyColorChange(); // Notify about potential change for this domain
      return true;
    } catch (error) {
      console.error(`Error saving theme for ${newDomain}:`, error);
      alert(`Error saving theme for ${newDomain}.`);
      // If renaming failed, the old theme might be gone. Consider adding it back?
      return false;
    }
  }

  handleEditDomain(domain, theme) {
    this.uiManager.prepareDomainFormForEdit(domain, theme);
  }

  handleCancelEditDomain() {
    this.uiManager.resetDomainForm(true);
  }

  async handleDeleteDomain(domain) {
    if (!confirm(`Are you sure you want to delete the theme for ${domain}?`)) {
      return;
    }
    try {
      await removeDomainColorTheme(domain);
      delete this.currentThemes.domains[domain];
      this.uiManager.renderDomainThemesList(
        this.currentThemes.domains,
        this.handleEditDomain.bind(this),
        this.handleDeleteDomain.bind(this)
      );
      if (this.uiManager.getEditingDomainName() === domain) {
        this.uiManager.resetDomainForm(true);
      }
      console.log(`Theme for ${domain} deleted.`);
      this.notifyColorChange();
    } catch (error) {
      console.error(`Error deleting theme for ${domain}:`, error);
      alert(`Error deleting theme for ${domain}.`);
    }
  }

  syncColors() {
    try {
      const mainAccent = this.uiManager.elements.mainAccentColor.value;
      const derivedColors = colorUtils.deriveColors(mainAccent);
      this.uiManager.updateDefaultColorPickers(derivedColors);
      return derivedColors;
    } catch (error) {
      console.error("Error syncing colors:", error);
      return null;
    }
  }

  notifyColorChange() {
    try {
      chrome.runtime.sendMessage({ action: "colorThemeChanged" });
      console.log("Sent colorThemeChanged message");
    } catch (error) {
      console.error("Error notifying about color change:", error);
    }
  }

  // Sync derived colors for the domain theme form
  syncDomainColors() {
    try {
      const mainAccent = this.uiManager.elements.domainMainAccentColor.value;
      const derivedColors = colorUtils.deriveColors(mainAccent);
      this.uiManager.updateDomainColorPickers(derivedColors);
      return derivedColors;
    } catch (error) {
      console.error("Error syncing domain colors:", error);
      return null;
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
      saveDefaultThemeButton,
      resetDefaultThemeButton,
      syncColorsButton,
      saveDomainThemeButton,
      cancelEditDomainThemeButton,
      syncDomainColorsButton,
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

    [mainAccentColor, hoverColor, disabledColor, summaryBgColor].forEach(
      (element) => {
        if (element) {
          element.addEventListener("input", () =>
            this.uiManager.updateColorPreviews()
          );
        }
      }
    );

    if (saveDefaultThemeButton) {
      saveDefaultThemeButton.addEventListener("click", () =>
        this.colorManager.saveDefaultTheme()
      );
    }

    if (resetDefaultThemeButton) {
      resetDefaultThemeButton.addEventListener("click", () =>
        this.colorManager.resetDefaultTheme()
      );
    }

    if (syncColorsButton) {
      syncColorsButton.addEventListener("click", () => {
        this.colorManager.syncColors();
      });
    }

    if (saveDomainThemeButton) {
      saveDomainThemeButton.addEventListener("click", () =>
        this.colorManager.saveDomainTheme()
      );
    }

    if (cancelEditDomainThemeButton) {
      cancelEditDomainThemeButton.addEventListener("click", () =>
        this.colorManager.handleCancelEditDomain()
      );
    }

    if (syncDomainColorsButton) {
      syncDomainColorsButton.addEventListener("click", () => {
        this.colorManager.syncDomainColors();
      });
    }
  }

  async init() {
    try {
      await Promise.allSettled([
        this.loadApiKey(),
        this.cacheManager.updateCacheSizes(),
        this.colorManager.loadThemes(),
      ]);
    } catch (error) {
      console.error("Critical error initializing options page:", error);
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

document.addEventListener("DOMContentLoaded", () => {
  const controller = new OptionsPageController();
  controller.init();
});
