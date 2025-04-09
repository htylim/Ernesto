/**
 * @typedef {Object} TabState
 * @property {string|null} url - Current tab URL
 * @property {string|null} title - Current tab title
 * @property {boolean} isLoading - Loading state
 * @property {string} loadingMessage - Current loading message
 */

/**
 * Manages the state for each tab in the extension
 * @class
 */
export class TabStateManager {
  constructor() {
    this.tabStates = new Map();
  }

  /**
   * Gets or initializes state for a tab
   * @param {number} tabId - Tab ID to get state for
   * @returns {TabState} Tab state object
   */
  getTabState(tabId) {
    if (!this.tabStates.has(tabId)) {
      this.tabStates.set(tabId, {
        url: null,
        title: null,
        isLoading: false,
        loadingMessage: "",
      });
    }
    return this.tabStates.get(tabId);
  }

  /**
   * Updates state for a specific tab
   * @param {number} tabId - Tab ID to update
   * @param {Partial<TabState>} updates - State updates to apply
   */
  async updateTabState(tabId, updates) {
    const currentState = this.getTabState(tabId);
    this.tabStates.set(tabId, { ...currentState, ...updates });
  }
}
