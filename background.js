import { clearExpiredCache } from "./summariesCache.js";
import { clearExpiredAudioCache } from "./speechifyCache.js";

// Clear expired caches on extension load
Promise.all([clearExpiredCache(), clearExpiredAudioCache()]).catch((error) => {
  console.error("Error clearing expired caches:", error);
});

// Configure and enable the side panel
chrome.runtime.onInstalled.addListener(() => {
  // Enable the side panel for all URLs
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel.html",
    tabId: null,
  });
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

setInterval(() => {
  Promise.all([clearExpiredCache(), clearExpiredAudioCache()]).catch(
    (error) => {
      console.error("Error during scheduled cache cleanup:", error);
    }
  );
}, CACHE_CLEANUP_INTERVAL);
