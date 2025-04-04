import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";
import { speechifySummary } from "./speechifySummary.js";

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

  let audioElement = null;
  let audioUrl = null;

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
  }

  async function checkCacheAndShowSummary() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.url) return;

      const cachedSummary = await getCachedSummary(tab.url);
      if (cachedSummary) {
        summaryDiv.innerHTML = cachedSummary;
        summaryDiv.style.display = "block";
        summarizeBtn.setAttribute("disabled", "disabled");
        speechifyBtn.removeAttribute("disabled");
      }
    } catch (error) {
      console.error("Cache check error:", error);
    }
  }

  // Check cache when popup opens
  await checkCacheAndShowSummary();

  summarizeBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.url) {
        throw new Error("Could not get current page URL");
      }
      const url = tab.url;
      console.log("Current URL:", url);

      loadingDiv.style.display = "block";
      summaryDiv.style.display = "none";

      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      console.log("Retrieved API Key:", openaiApiKey);

      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const summary = await getSummary(url, openaiApiKey);
      await cacheSummary(url, summary);

      summaryDiv.innerHTML = summary;
      summaryDiv.style.display = "block";
      summarizeBtn.setAttribute("disabled", "disabled");
      speechifyBtn.removeAttribute("disabled");
    } catch (error) {
      console.error("Summarization error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      summaryDiv.style.display = "block";
    } finally {
      loadingDiv.style.display = "none";
    }
  });

  speechifyBtn.addEventListener("click", async () => {
    try {
      loadingDiv.style.display = "block";
      audioPlayer.style.display = "none";
      cleanupAudio();

      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const summaryText = summaryDiv.textContent;
      const audioBlob = await speechifySummary(summaryText, openaiApiKey);

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
    } catch (error) {
      console.error("Speechify error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
    } finally {
      loadingDiv.style.display = "none";
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
});
