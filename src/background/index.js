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

// --- One-time Setup ---
// Configure and enable the side panel, create context menu, and run migrations
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Ernesto extension installed/updated. Performing setup.', details);
  configureSidePanel();

  // Create context menu item
  chrome.contextMenus.create({
    id: "openAndSummarize",
    title: "Open && Summarize", // Using your version with '&&'
    contexts: ["link"]
  });
});

// --- Global Event Listeners ---

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

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openAndSummarize") {
    if (info.linkUrl) {
      // Always open in a new tab in the background (not active)
      chrome.tabs.create({ url: info.linkUrl, active: false });
      
      // Placeholder for summarization logic to be added later
      console.log("Link opened in new tab. Summarization to be implemented.");
    }
  }
});

// Schedule cache cleanup every 1 hour
const CACHE_CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

setInterval(clearAllExpiredCaches, CACHE_CLEANUP_INTERVAL);
