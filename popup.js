import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { getSpeechifyAudio } from "./getSpeechifyAudio.js";
import { getCachedAudio, cacheAudio } from "./speechifyCache.js";

// Constants
const DISPLAY_STATES = {
  VISIBLE: "block",
  HIDDEN: "none",
};

const LOADING_MESSAGES = {
  SUMMARY: "Generating Summary...",
  AUDIO: "Generating Audio...",
};

// UI State Manager
class UIStateManager {
  constructor() {
    this.elements = {
      summarizeBtn: document.getElementById("summarize"),
      openOptionsBtn: document.getElementById("openOptions"),
      speechifyBtn: document.getElementById("speechify"),
      loadingDiv: document.getElementById("loading"),
      summaryDiv: document.getElementById("summary"),
      audioPlayer: document.getElementById("audioPlayer"),
      playAudioBtn: document.getElementById("playAudio"),
      pauseAudioBtn: document.getElementById("pauseAudio"),
      restartAudioBtn: document.getElementById("restartAudio"),
      loadingText: document.getElementById("loadingText"),
    };
  }

  showLoading(message) {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.elements.loadingText.textContent = message;
    this.updateButtonStates();
  }

  hideLoading() {
    this.elements.loadingDiv.style.display = DISPLAY_STATES.HIDDEN;
    this.updateButtonStates();
  }

  showSummary(summary) {
    this.elements.summaryDiv.innerHTML = summary;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  showError(message) {
    this.elements.summaryDiv.textContent = `Error: ${message}`;
    this.elements.summaryDiv.style.display = DISPLAY_STATES.VISIBLE;
    this.updateButtonStates();
  }

  updateButtonStates() {
    const isRequestOngoing =
      this.elements.loadingDiv.style.display === DISPLAY_STATES.VISIBLE;
    const hasSummary =
      this.elements.summaryDiv.style.display === DISPLAY_STATES.VISIBLE;
    const hasAudioPlayer =
      this.elements.audioPlayer.style.display === DISPLAY_STATES.VISIBLE;

    this.elements.summarizeBtn.disabled = hasSummary || isRequestOngoing;
    this.elements.speechifyBtn.disabled = hasAudioPlayer || isRequestOngoing;
  }
}

// Audio Controller
class AudioController {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.audioElement = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const { playAudioBtn, pauseAudioBtn, restartAudioBtn } =
      this.uiManager.elements;

    playAudioBtn.addEventListener("click", () => this.play());
    pauseAudioBtn.addEventListener("click", () => this.pause());
    restartAudioBtn.addEventListener("click", () => this.restart());
  }

  play() {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  restart() {
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play();
    }
  }

  setupAudio(audioBlob, autoPlay = false) {
    const audioUrl = URL.createObjectURL(audioBlob);
    this.audioElement = new Audio(audioUrl);

    const { playAudioBtn, pauseAudioBtn, restartAudioBtn, audioPlayer } =
      this.uiManager.elements;

    this.audioElement.addEventListener("play", () => {
      playAudioBtn.disabled = true;
      pauseAudioBtn.disabled = false;
      restartAudioBtn.disabled = false;
    });

    this.audioElement.addEventListener("pause", () => {
      playAudioBtn.disabled = false;
      pauseAudioBtn.disabled = true;
    });

    this.audioElement.addEventListener("ended", () => {
      playAudioBtn.disabled = false;
      pauseAudioBtn.disabled = true;
    });

    audioPlayer.style.display = DISPLAY_STATES.VISIBLE;

    if (autoPlay) {
      this.audioElement.play();
    }
  }

  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }
  }
}

// Main application
class SummarizerApp {
  constructor() {
    this.uiManager = new UIStateManager();
    this.audioController = new AudioController(this.uiManager);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const { summarizeBtn, speechifyBtn, openOptionsBtn } =
      this.uiManager.elements;

    summarizeBtn.addEventListener("click", () => this.summarize());
    speechifyBtn.addEventListener("click", () => this.speechify());
    openOptionsBtn.addEventListener("click", () =>
      chrome.runtime.openOptionsPage()
    );
  }

  async getCurrentUrl() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url) {
      throw new Error("Could not get current page URL");
    }

    return tab.url;
  }

  async getApiKey() {
    const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
    if (!openaiApiKey) {
      throw new Error("API key not found. Please set it in settings.");
    }
    return openaiApiKey;
  }

  async summarize() {
    try {
      const url = await this.getCurrentUrl();
      console.log("Generating summary for:", url);

      this.uiManager.showLoading(LOADING_MESSAGES.SUMMARY);
      this.uiManager.elements.summaryDiv.style.display = DISPLAY_STATES.HIDDEN;

      const apiKey = await this.getApiKey();
      const summary = await getSummary(url, apiKey);
      await cacheSummary(url, summary);
      this.uiManager.showSummary(summary);
      return true;
    } catch (error) {
      console.error("Summarization error:", error);
      this.uiManager.showError(error.message);
      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  async speechify() {
    try {
      if (
        this.uiManager.elements.summaryDiv.style.display !==
        DISPLAY_STATES.VISIBLE
      ) {
        const success = await this.summarize();
        if (!success) return;
      }

      const currentUrl = await this.getCurrentUrl();
      this.uiManager.showLoading(LOADING_MESSAGES.AUDIO);
      this.uiManager.elements.audioPlayer.style.display = DISPLAY_STATES.HIDDEN;

      const apiKey = await this.getApiKey();
      const summaryText = this.uiManager.elements.summaryDiv.textContent;
      const audioBlob = await getSpeechifyAudio(summaryText, apiKey);
      await cacheAudio(currentUrl, audioBlob);

      this.audioController.setupAudio(audioBlob, true);
      return true;
    } catch (error) {
      console.error("Speechify error:", error);
      this.uiManager.showError(error.message);
      this.uiManager.elements.audioPlayer.style.display = DISPLAY_STATES.HIDDEN;
      return false;
    } finally {
      this.uiManager.hideLoading();
    }
  }

  async checkCaches() {
    try {
      const url = await this.getCurrentUrl();

      // Check summary cache
      const cachedSummary = await getCachedSummary(url);
      if (cachedSummary) {
        this.uiManager.showSummary(cachedSummary);
      }

      // Check audio cache
      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        const audioBlob = new Blob([cachedAudioData], { type: "audio/mpeg" });
        this.audioController.setupAudio(audioBlob);
      }

      // Update button states after checking caches
      this.uiManager.updateButtonStates();
    } catch (error) {
      console.error("Cache check error:", error);
    }
  }

  cleanup() {
    this.audioController.cleanup();
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  const app = new SummarizerApp();
  await app.checkCaches();

  // Clean up resources when popup is closed
  window.addEventListener("unload", () => app.cleanup());
});
