import { clearCache } from "./summariesCache.js";
import { clearAudioCache } from "./speechifyCache.js";
import { audioCache } from "./speechifyCache.js";
import { summariesCache } from "./summariesCache.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page loaded");

  const apiKeyInput = document.querySelector("#apiKey");
  const saveButton = document.querySelector("#save");
  const cancelButton = document.querySelector("#cancel");
  const purgeCacheButton = document.querySelector("#purgeCache");
  const purgeAudioCacheButton = document.querySelector("#purgeAudioCache");
  const purgeStatus = document.querySelector("#purgeStatus");
  const purgeAudioStatus = document.querySelector("#purgeAudioStatus");
  const summariesSize = document.querySelector("#summariesSize");
  const audioSize = document.querySelector("#audioSize");

  console.log("Purge cache button:", purgeCacheButton);

  // Load saved API key
  async function loadApiKey() {
    try {
      console.log("Starting to load API key...");
      const result = await chrome.storage.local.get(["openaiApiKey"]);
      console.log("API key load result:", result);
      if (result.openaiApiKey) {
        console.log("Found API key, setting input value");
        apiKeyInput.value = result.openaiApiKey;
        console.log("Input value set to:", apiKeyInput.value);
      } else {
        console.log("No API key found in storage");
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  }

  // Initial loads
  loadApiKey();
  updateCacheSizes();

  // Update cache sizes
  async function updateCacheSizes() {
    const summariesBytes = await summariesCache.getCacheSize();
    const audioBytes = await audioCache.getCacheSize();

    summariesSize.textContent = formatBytes(summariesBytes);
    audioSize.textContent = formatBytes(audioBytes);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Save button handler
  saveButton.addEventListener("click", () => {
    chrome.storage.local.set({ openaiApiKey: apiKeyInput.value }, () => {
      console.log("API Key saved:", apiKeyInput.value);
      window.close();
    });
  });

  // Cancel button handler
  cancelButton.addEventListener("click", () => {
    window.close();
  });

  console.log("Cache button loaded");

  // Purge summary cache button handler
  purgeCacheButton.addEventListener("click", async () => {
    console.log("Purge cache button clicked");

    try {
      purgeCacheButton.disabled = true;
      purgeStatus.textContent = "Purging summaries cache...";

      await clearCache();
      console.log("Summaries cache cleared successfully");
      await updateCacheSizes();

      purgeStatus.textContent = "Summaries cache purged successfully!";
      setTimeout(() => {
        purgeStatus.textContent = "";
        purgeCacheButton.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Error purging summaries cache:", error);
      purgeStatus.textContent =
        "Error purging summaries cache. Please try again.";
      purgeCacheButton.disabled = false;
    }
  });

  // Purge audio cache button handler
  purgeAudioCacheButton.addEventListener("click", async () => {
    try {
      purgeAudioCacheButton.disabled = true;
      purgeAudioStatus.textContent = "Purging audio cache...";

      await clearAudioCache();
      console.log("Audio cache cleared successfully");
      await updateCacheSizes();

      purgeAudioStatus.textContent = "Audio cache purged successfully!";
      setTimeout(() => {
        purgeAudioStatus.textContent = "";
        purgeAudioCacheButton.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Error purging audio cache:", error);
      purgeAudioStatus.textContent =
        "Error purging audio cache. Please try again.";
      purgeAudioCacheButton.disabled = false;
    }
  });
});
