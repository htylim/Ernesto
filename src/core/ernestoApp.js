/**
 * Core class responsible for managing the Ernesto extension
 */
import { clearExpiredCache } from "../common/cache/summariesCache.js";
import { clearExpiredAudioCache } from "../common/cache/speechifyCache.js";
import { clearExpiredPromptsCache } from "../common/cache/promptsCache.js";

export class ErnestoApp {
  /**
   * @typedef {Object} CacheConfig
   * @property {number} ttl - Time to live in milliseconds
   * @property {number} maxSize - Maximum size in bytes
   */

  /**
   * Initialize the ErnestoApp instance
   */
  constructor() {
    this.CACHE_CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
    this.cleanupInterval = null;
  }

  /**
   * Initialize the extension
   * @returns {void}
   */
  init() {
    console.log('Ernesto extension initialized');
    
    // Clear expired caches on initialization
    this.clearAllExpiredCaches();
    
    // Start periodic cache cleanup
    this.startCacheCleanupInterval();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Configure context menu on extension install/update
   * @param {Object} details - Installation details
   * @returns {void}
   */
  setupExtension(details) {
    console.log('Ernesto extension installed/updated. Performing setup.', details);

    chrome.contextMenus.create({
      id: "openAndSummarize",
      title: "Open && Summarize",
      contexts: ["link"]
    });    
  }

  /**
   * Clears all expired caches
   * @returns {Promise<void>}
   */
  async clearAllExpiredCaches() {
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

  /**
   * Start the periodic cache cleanup interval
   * @returns {void}
   */
  startCacheCleanupInterval() {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Schedule cache cleanup
    this.cleanupInterval = setInterval(
      () => this.clearAllExpiredCaches(), 
      this.CACHE_CLEANUP_INTERVAL
    );
  }

  /**
   * Stop the periodic cache cleanup interval
   * @returns {void}
   */
  stopCacheCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Set up all Chrome extension event listeners
   * @returns {void}
   */
  setupEventListeners() {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener(details => this.setupExtension(details));
    
    // Handle extension icon click
    chrome.action.onClicked.addListener(tab => this.handleActionClick(tab));
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener(changes => this.handleStorageChange(changes));
    
    // Handle context menu click
    chrome.contextMenus.onClicked.addListener((info, tab) => this.handleContextMenuClick(info, tab));
  }

  /**
   * Open the sidepanel for a specific tab
   * @param {number} tabId - ID of the tab to open the sidepanel for
   * @returns {void}
   */
  openSidepanel(tabId) {
    chrome.sidePanel.setOptions({
      enabled: true,
      path: "src/sidepanel/index.html",
      tabId: tabId,
    });
    chrome.sidePanel.open({ tabId: tabId });
  }

  /**
   * Handle click on the extension icon
   * @param {Object} tab - Current tab information
   * @returns {void}
   */
  handleActionClick(tab) {
    // Open sidepanel on the current tab
    this.openSidepanel(tab.id);
  }

  /**
   * Handle changes to extension storage
   * @param {Object} changes - Storage changes
   * @returns {void}
   */
  handleStorageChange(changes) {
    if (changes.openaiApiKey) {
      console.log(
        "API Key changed:",
        changes.openaiApiKey.newValue ? "✓ Key set" : "✗ Key cleared"
      );
    }
  }

  /**
   * Handle context menu click
   * @param {Object} info - Information about the context menu click
   * @param {Object} tab - Current tab information
   * @returns {void}
   */
  handleContextMenuClick(info, tab) {
    if (info.menuItemId === "openAndSummarize") {
      if (info.linkUrl) {
        // Open in a new tab in the background
        chrome.tabs.create({ url: info.linkUrl, active: false }, (newTab) => {
          // Open the sidepanel in the newly created tab
          this.openSidepanel(newTab.id);
          console.log("Link opened in new tab with sidepanel opened for summarization.");
        });
      }
    }
  }
} 