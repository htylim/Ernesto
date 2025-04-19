/**
 * @typedef {Object} CacheConfig
 * @property {number} ttl - Time to live in milliseconds
 * @property {number} maxSize - Maximum size in bytes
 */

import { clearExpiredCache } from "../common/cache/summariesCache.js";
import { clearExpiredAudioCache } from "../common/cache/speechifyCache.js";
import { clearExpiredPromptsCache } from "../common/cache/promptsCache.js";

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
    path: "src/sidepanel/index.html",
    tabId: null,
  });
}

// Configure and enable the side panel, and run migrations
chrome.runtime.onInstalled.addListener(async (details) => {
  configureSidePanel();
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

// Schedule cache cleanup every 1 hour
const CACHE_CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

setInterval(clearAllExpiredCaches, CACHE_CLEANUP_INTERVAL);
