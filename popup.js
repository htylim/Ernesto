import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { getSpeechifyAudio } from "./getSpeechifyAudio.js";
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

  function enableDisableRequestButtons() {
    const isRequestOngoing = loadingDiv.style.display === "block";
    const hasSummary = summaryDiv.style.display === "block";
    const hasAudioPlayer = audioPlayer.style.display === "block";

    // Summarize button is disabled when there's a summary or during requests
    summarizeBtn.disabled = hasSummary || isRequestOngoing;

    // Speechify button is disabled when audio player is shown or during requests
    speechifyBtn.disabled = hasAudioPlayer || isRequestOngoing;
  }

  function showPlaybackControls(audioBlob, autoPlay = false) {
    const audioUrl = URL.createObjectURL(audioBlob);
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

    if (autoPlay) {
      audioElement.play();
    }
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

      enableDisableRequestButtons();

      summaryDiv.style.display = "none";
      loadingText.textContent = "Generating Summary...";

      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const summary = await getSummary(url, openaiApiKey);

      // add to the cache the summary that we just received
      await cacheSummary(url, summary);

      // show the summary in the UI
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
      enableDisableRequestButtons();
    }
  }

  async function speechify() {
    try {
      // If no summary then auto trigger the summary generation
      if (summaryDiv.style.display !== "block") {
        const success = await summarize();
        if (!success) return;
      }

      // Get current tab URL first
      const currentUrl = await getCurrentUrl();

      loadingDiv.style.display = "block";

      enableDisableRequestButtons();

      audioPlayer.style.display = "none";
      loadingText.textContent = "Generating Audio...";

      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const summaryText = summaryDiv.textContent; // the text that we need to speechify

      const audioBlob = await getSpeechifyAudio(summaryText, openaiApiKey);

      // add to the cache the audio that we just received
      await cacheAudio(currentUrl, audioBlob);

      // show the speechify controls in the UI
      showPlaybackControls(audioBlob, true /*autoPlay*/);

      return true;
    } catch (error) {
      console.error("Speechify error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      audioPlayer.style.display = "none";
      return false;
    } finally {
      loadingDiv.style.display = "none";
      enableDisableRequestButtons();
    }
  }

  async function checkSpeechifyCache() {
    try {
      const url = await getCurrentUrl();
      const cachedAudioData = await getCachedAudio(url);
      if (cachedAudioData) {
        const audioBlob = new Blob([cachedAudioData], { type: "audio/mpeg" });
        showPlaybackControls(audioBlob);
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
  speechifyBtn.addEventListener("click", speechify);

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

  enableDisableRequestButtons();
});
