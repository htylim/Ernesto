import { clearCache } from "./summariesCache.js";
import { clearAudioCache } from "./speechifyCache.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page loaded");

  const apiKeyInput = document.querySelector("#apiKey");
  const saveButton = document.querySelector("#save");
  const cancelButton = document.querySelector("#cancel");
  const purgeCacheButton = document.querySelector("#purgeCache");
  const purgeAudioCacheButton = document.querySelector("#purgeAudioCache");
  const purgeStatus = document.querySelector("#purgeStatus");
  const purgeAudioStatus = document.querySelector("#purgeAudioStatus");

  console.log("Purge cache button:", purgeCacheButton);

  // Load saved API key
  chrome.storage.local.get(["openaiApiKey"], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

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
