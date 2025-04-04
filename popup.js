import { getSummary } from "./getSummary.js";
import { getCachedSummary, cacheSummary } from "./summariesCache.js";

document.addEventListener("DOMContentLoaded", async function () {
  const summarizeBtn = document.getElementById("summarize");
  const openOptionsBtn = document.getElementById("openOptions");
  const loadingDiv = document.getElementById("loading");
  const summaryDiv = document.getElementById("summary");

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
    } catch (error) {
      console.error("Summarization error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      summaryDiv.style.display = "block";
    } finally {
      loadingDiv.style.display = "none";
    }
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
