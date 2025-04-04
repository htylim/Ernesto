import { clearCache } from "./summariesCache.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page loaded");

  const apiKeyInput = document.querySelector("#apiKey");
  const saveButton = document.querySelector("#save");
  const cancelButton = document.querySelector("#cancel");
  const purgeCacheButton = document.querySelector("#purgeCache");
  const purgeStatus = document.querySelector("#purgeStatus");

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

  // Purge cache button handler
  purgeCacheButton.addEventListener("click", async () => {
    console.log("Purge cache button clicked");

    try {
      purgeCacheButton.disabled = true;
      purgeStatus.textContent = "Purging cache...";

      await clearCache();
      console.log("Cache cleared successfully");

      purgeStatus.textContent = "Cache purged successfully!";
      setTimeout(() => {
        purgeStatus.textContent = "";
        purgeCacheButton.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Error purging cache:", error);
      purgeStatus.textContent = "Error purging cache. Please try again.";
      purgeCacheButton.disabled = false;
    }
  });
});
