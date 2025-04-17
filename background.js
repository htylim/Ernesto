/**
 * @typedef {Object} CacheConfig
 * @property {number} ttl - Time to live in milliseconds
 * @property {number} maxSize - Maximum size in bytes
 */

import { clearExpiredCache } from "./summariesCache.js";
import { clearExpiredAudioCache } from "./speechifyCache.js";
import { clearExpiredPromptsCache } from "./promptsCache.js";
import { migrateThemeSettings } from "./colorThemeManager.js";

/**
 * Clears all expired caches
 * @returns {Promise<void>}
 */
async function clearAllExpiredCaches() {
  try {
    await Promise.all([
      clearExpiredCache(),
      clearExpiredAudioCache(),
      clearExpiredPromptsCache(),
    ]);
  } catch (error) {
    console.error("Error clearing expired caches:", error);
  }
}

// Clear expired caches on extension load
clearAllExpiredCaches();

/**
 * Configures the side panel for the extension
 */
function configureSidePanel() {
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel.html",
    tabId: null,
  });
}

// Configure and enable the side panel, and run migrations
chrome.runtime.onInstalled.addListener(async (details) => {
  configureSidePanel();
  // Run theme migration on install/update
  await migrateThemeSettings();
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.openaiApiKey) {
    console.log(
      "API Key changed:",
      changes.openaiApiKey.newValue ? "✓ Key set" : "✗ Key cleared"
    );
  }
});

// Schedule cache cleanup every 12 hours
const CACHE_CLEANUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

setInterval(clearAllExpiredCaches, CACHE_CLEANUP_INTERVAL);
