/**
 * Manages the UI state and interactions for the extension's side panel
 * @class
 */
export class UIStateManager {
  constructor() {
    this.elements = this.initializeElements();
    this.validateElements();
  }

  /**
   * Initializes references to DOM elements
   * @private
   * @returns {Object} Object containing DOM element references
   */
  initializeElements() {
    return {
      summarizeBtn: document.getElementById("summarize"),
      openOptionsBtn: document.getElementById("openOptions"),
      closeBtn: document.getElementById("closePanel"),
      speechifyBtn: document.getElementById("speechify"),
      loadingDiv: document.getElementById("loading"),
      summaryDiv: document.getElementById("summary"),
      promptResponsesDiv: document.getElementById("promptResponses"),
      audioPlayer: document.getElementById("audioPlayer"),
      playAudioBtn: document.getElementById("playAudio"),
      pauseAudioBtn: document.getElementById("pauseAudio"),
      restartAudioBtn: document.getElementById("restartAudio"),
      loadingText: document.getElementById("loadingText"),
      pageTitle: document.getElementById("page-title"),
      tabContent: document.getElementById("tab-content"),
      tabUnavailable: document.getElementById("tab-unavailable"),
      promptInput: document.getElementById("promptInput"),
      submitPromptBtn: document.getElementById("submitPrompt"),
      audioTitle: document.getElementById("audio-title"),
      promptContainer: document.querySelector(".prompt-container"),
    };
  }

  /**
   * Validates that all required elements are present
   * @private
   * @throws {Error} If any required element is missing
   */
  validateElements() {
    const requiredElements = [
      "summarizeBtn",
      "openOptionsBtn",
      "closeBtn",
      "speechifyBtn",
      "loadingDiv",
      "summaryDiv",
      "audioPlayer",
      "playAudioBtn",
      "pauseAudioBtn",
      "restartAudioBtn",
      "loadingText",
      "pageTitle",
      "tabContent",
      "tabUnavailable",
      "promptInput",
      "submitPromptBtn",
      "promptContainer",
    ];

    const missingElements = requiredElements
      .filter((name) => !this.elements[name])
      .map((name) => name);

    if (missingElements.length > 0) {
      throw new Error(
        `Missing required elements: ${missingElements.join(", ")}`
      );
    }
  }

  /**
   * Shows an element by removing the 'hidden' class
   * @private
   * @param {HTMLElement} element - Element to show
   */
  showElement(element) {
    if (element) {
      element.classList.remove("hidden");
    }
  }

  /**
   * Hides an element by adding the 'hidden' class
   * @private
   * @param {HTMLElement} element - Element to hide
   */
  hideElement(element) {
    if (element) {
      element.classList.add("hidden");
    }
  }

  /**
   * Checks if an element is visible (does not have the 'hidden' class)
   * @private
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is visible
   */
  isElementVisible(element) {
    return element ? !element.classList.contains("hidden") : false;
  }

  /**
   * Shows loading state with specified message
   * @param {string} message - Loading message to display
   */
  showLoading(message) {
    this.showElement(this.elements.loadingDiv);
    this.elements.loadingText.textContent = message;
    this.updateButtonStates();
  }

  /**
   * Hides loading state
   */
  hideLoading() {
    this.hideElement(this.elements.loadingDiv);
    this.updateButtonStates();
  }

  /**
   * Shows summary content
   * @param {string} summary - HTML content of the summary
   */
  showSummary(summary) {
    this.setSummaryText(summary, true);
    this.showElement(this.elements.summaryDiv);
    this.updateButtonStates();
  }

  /**
   * Shows error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.setSummaryText(`Error: ${message}`);
    this.showElement(this.elements.summaryDiv);
    this.updateButtonStates();
  }

  /**
   * Updates button states based on current UI state
   * @private
   */
  updateButtonStates() {
    const isRequestOngoing = this.isElementVisible(this.elements.loadingDiv);

    this.elements.summarizeBtn.disabled = isRequestOngoing;
    this.elements.speechifyBtn.disabled = isRequestOngoing;
    this.elements.submitPromptBtn.disabled = isRequestOngoing;
  }

  /**
   * Shows tab content
   * @param {string} title - Tab title to display
   */
  showTabContent(title) {
    this.showElement(this.elements.tabContent);
    this.hideElement(this.elements.tabUnavailable);
    this.showElement(this.elements.promptContainer);
    this.elements.pageTitle.textContent = title || "Current Page";
  }

  /**
   * Shows tab unavailable message
   */
  showTabUnavailable() {
    this.hideElement(this.elements.tabContent);
    this.showElement(this.elements.tabUnavailable);
    this.hideElement(this.elements.promptContainer);
  }

  /**
   * Resets UI to initial state
   */
  resetUI() {
    this.setSummaryText("", true);
    this.hideElement(this.elements.summaryDiv);
    this.hideElement(this.elements.loadingDiv);
    this.clearPromptResponses();
    this.hideElement(this.elements.promptContainer);
    this.updateButtonStates();
  }

  /**
   * Hides the summary div
   */
  hideSummary() {
    this.hideElement(this.elements.summaryDiv);
    this.updateButtonStates();
  }

  /**
   * Checks if summary is currently visible
   * @returns {boolean} Whether summary is visible
   */
  isSummaryVisible() {
    return (
      !!this.getSummaryText() && this.isElementVisible(this.elements.summaryDiv)
    );
  }

  /**
   * Gets the current summary text content
   * @returns {string} The text content of the summary div
   */
  getSummaryText() {
    return this.elements.summaryDiv.textContent || "";
  }

  /**
   * Sets the summary text content
   * @param {string} text - Text content to set
   * @param {boolean} isHtml - Whether the content is HTML (default: false)
   */
  setSummaryText(text, isHtml = false) {
    if (isHtml) {
      this.elements.summaryDiv.innerHTML = text;
    } else {
      this.elements.summaryDiv.textContent = text;
    }
  }

  /**
   * Shows the audio player
   */
  showAudioPlayer() {
    this.showElement(this.elements.audioPlayer);
  }

  /**
   * Hides the audio player
   */
  hideAudioPlayer() {
    this.hideElement(this.elements.audioPlayer);
  }

  /**
   * Gets UI control buttons
   * @returns {Object} Object containing button element references
   */
  getControlButtons() {
    return {
      summarizeBtn: this.elements.summarizeBtn,
      speechifyBtn: this.elements.speechifyBtn,
      openOptionsBtn: this.elements.openOptionsBtn,
      closeBtn: this.elements.closeBtn,
    };
  }

  /**
   * Gets the current prompt text
   * @returns {string} The text content of the prompt input
   */
  getPromptText() {
    return this.elements.promptInput?.value || "";
  }

  /**
   * Clear the prompt input field
   */
  clearPromptInput() {
    this.elements.promptInput.value = "";
  }

  /**
   * Add prompt and response to the UI
   * @param {Object} promptData - Object containing prompt and response
   * @param {string} promptData.prompt - The user's prompt
   * @param {string} promptData.response - The AI response
   */
  addPromptResponse(promptData) {
    const promptResponseHtml = `
      <div class="prompt-item">
        <div class="user-prompt">
          ${promptData.prompt}
        </div>
        <div class="ai-response">
          ${window.marked.parse(promptData.response)}
        </div>
      </div>
    `;

    this.elements.promptResponsesDiv.innerHTML += promptResponseHtml;
    this.showElement(this.elements.promptResponsesDiv);

    // Scroll to the bottom of the responses
    this.elements.promptResponsesDiv.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    // Also ensure the tab content container scrolls to show the new content
    this.elements.tabContent.scrollTop = this.elements.tabContent.scrollHeight;
  }

  /**
   * Get the prompt input and submit buttons
   * @returns {Object} Object containing prompt input elements
   */
  getPromptElements() {
    return {
      promptInput: this.elements.promptInput,
      submitPromptBtn: this.elements.submitPromptBtn,
    };
  }

  /**
   * Clears all prompt responses from the UI
   */
  clearPromptResponses() {
    if (this.elements.promptResponsesDiv) {
      this.elements.promptResponsesDiv.innerHTML = "";
      this.hideElement(this.elements.promptResponsesDiv);
    }
  }

  /**
   * sets the article title label
   * @param {string} title - The article title
   */
  setAudioTitle(title) {
    if (this.elements.audioTitle) {
      this.elements.audioTitle.innerHTML = title;
    }
  }

  /**
   * extracts from the article the title of the article.
   * @returns {String} the article title as it appears on the symmary div
   */
  readArticleTitle() {
    const summaryDiv = this.elements.summaryDiv;
    if (summaryDiv) {
      const h1Element = summaryDiv.querySelector("h1");
      return h1Element ? h1Element.textContent.trim() : "";
    }
    return "";
  }
}
