import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { speechifySummary } from "./speechifySummary.js";
import { getCachedAudio, cacheAudio } from "./speechifyCache.js";

document.addEventListener("DOMContentLoaded", async function () {
  const summarizeBtn = document.getElementById("summarize");
  const openOptionsBtn = document.getElementById("openOptions");
  const speechifyBtn = document.getElementById("speechify");
  const loadingDiv = document.getElementById("loading");
  const summaryDiv = document.getElementById("summary");
  const audioPlayer = document.getElementById("audioPlayer");
  const playAudioBtn = document.getElementById("playAudio");
  const pauseAudioBtn = document.getElementById("pauseAudio");
  const restartAudioBtn = document.getElementById("restartAudio");
  const loadingText = document.getElementById("loadingText");

  let audioElement = null;
  let audioUrl = null;

  function enableDisableTopButtons() {
    const isRequestOngoing = loadingDiv.style.display === "block";
    const hasSummary = summaryDiv.style.display === "block";
    const hasAudioPlayer = audioPlayer.style.display === "block";

    // Summarize button is disabled when there's a summary or during requests
    summarizeBtn.disabled = hasSummary || isRequestOngoing;

    // Speechify button is disabled when audio player is shown or during requests
    speechifyBtn.disabled = hasAudioPlayer || isRequestOngoing;
  }

  function cleanupAudio() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    playAudioBtn.disabled = false;
    pauseAudioBtn.disabled = true;
    restartAudioBtn.disabled = true;
    audioPlayer.style.display = "none";
    enableDisableTopButtons();
  }

  async function getCurrentUrl() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url) {
      throw new Error("Could not get current page URL");
    }

    return tab?.url;
  }

  async function summarize() {
    try {
      const url = await getCurrentUrl();
      console.log("Generating summary for:", url);

      loadingDiv.style.display = "block";
      enableDisableTopButtons();
      summaryDiv.style.display = "none";
      loadingText.textContent = "Generating Summary...";

      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const summary = await getSummary(url, openaiApiKey);
      await cacheSummary(url, summary);

      summaryDiv.innerHTML = summary;
      summaryDiv.style.display = "block";
      return true;
    } catch (error) {
      console.error("Summarization error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      summaryDiv.style.display = "block";
      return false;
    } finally {
      loadingDiv.style.display = "none";
      enableDisableTopButtons();
    }
  }

  async function speechify() {
    try {
      // Get current tab URL first
      const currentUrl = await getCurrentUrl();

      loadingDiv.style.display = "block";

      enableDisableTopButtons();

      audioPlayer.style.display = "none";
      loadingText.textContent = "Generating Audio...";

      cleanupAudio();

      // Check cache first
      const cachedAudioData = await getCachedAudio(currentUrl);
      let audioBlob;

      if (cachedAudioData) {
        audioBlob = new Blob([cachedAudioData], { type: "audio/mpeg" });
        loadingText.textContent = "Loading Audio...";
      } else {
        const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
        if (!openaiApiKey) {
          throw new Error("API key not found. Please set it in settings.");
        }

        const summaryText = summaryDiv.textContent;
        audioBlob = await speechifySummary(summaryText, openaiApiKey);

        // Log the size and cache the audio
        const sizeInMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
        console.log(`Audio size: ${sizeInMB}MB`);
        await cacheAudio(currentUrl, audioBlob);
      }

      audioUrl = URL.createObjectURL(audioBlob);
      audioElement = new Audio(audioUrl);

      audioElement.addEventListener("play", () => {
        playAudioBtn.disabled = true;
        pauseAudioBtn.disabled = false;
        restartAudioBtn.disabled = false;
      });

      audioElement.addEventListener("pause", () => {
        playAudioBtn.disabled = false;
        pauseAudioBtn.disabled = true;
      });

      audioElement.addEventListener("ended", () => {
        playAudioBtn.disabled = false;
        pauseAudioBtn.disabled = true;
      });

      audioPlayer.style.display = "block";
      audioElement.play();

      enableDisableTopButtons();
    } catch (error) {
      console.error("Speechify error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      audioPlayer.style.display = "none";
      enableDisableTopButtons();
    } finally {
      loadingDiv.style.display = "none";
      enableDisableTopButtons();
    }
  }

  async function checkSpeechifyCache() {
    try {
      const url = await getCurrentUrl();
      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        const audioBlob = new Blob([cachedAudioData], { type: "audio/mpeg" });
        audioUrl = URL.createObjectURL(audioBlob);
        audioElement = new Audio(audioUrl);

        // Show playback controls
        audioElement.addEventListener("play", () => {
          playAudioBtn.disabled = true;
          pauseAudioBtn.disabled = false;
          restartAudioBtn.disabled = false;
        });

        audioElement.addEventListener("pause", () => {
          playAudioBtn.disabled = false;
          pauseAudioBtn.disabled = true;
        });

        audioElement.addEventListener("ended", () => {
          playAudioBtn.disabled = false;
          pauseAudioBtn.disabled = true;
        });

        audioPlayer.style.display = "block";
      }
    } catch (error) {
      console.error("Speechify cache check error:", error);
    }
  }

  async function checkSummaryCache() {
    try {
      const url = await getCurrentUrl();
      const cachedSummary = await getCachedSummary(url);
      if (cachedSummary) {
        summaryDiv.innerHTML = cachedSummary;
        summaryDiv.style.display = "block";
      }
    } catch (error) {
      console.error("Summary cache check error:", error);
    }
  }

  summarizeBtn.addEventListener("click", summarize);

  speechifyBtn.addEventListener("click", async () => {
    try {
      // If no summary then auto trigger the summary generation
      if (summaryDiv.style.display !== "block") {
        const success = await summarize();
        if (!success) return;
      }

      await speechify();
    } finally {
      loadingDiv.style.display = "none";
      enableDisableTopButtons();
    }
  });

  playAudioBtn.addEventListener("click", () => {
    if (audioElement) {
      audioElement.play();
    }
  });

  pauseAudioBtn.addEventListener("click", () => {
    if (audioElement) {
      audioElement.pause();
    }
  });

  restartAudioBtn.addEventListener("click", () => {
    if (audioElement) {
      audioElement.currentTime = 0;
      audioElement.play();
    }
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Check caches when popup opens, and show relevant controls when data is available in cache
  await checkSummaryCache();
  await checkSpeechifyCache();

  enableDisableTopButtons();
});
