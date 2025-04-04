import { getSummary } from "./getSummary.js";

document.addEventListener("DOMContentLoaded", function () {
  const summarizeBtn = document.getElementById("summarize");
  const openOptionsBtn = document.getElementById("openOptions");
  const loadingDiv = document.getElementById("loading");
  const summaryDiv = document.getElementById("summary");

  summarizeBtn.addEventListener("click", async () => {
    try {
      // Get current tab URL using chrome.tabs API
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.url) {
        throw new Error("Could not get current page URL");
      }
      const url = tab.url;
      console.log("Current URL:", url);

      // Show loading state
      loadingDiv.style.display = "block";
      summaryDiv.style.display = "none";

      // Get API key from storage using correct key name
      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      console.log("Retrieved API Key:", openaiApiKey);

      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      // Get summary using the API function
      const summary = await getSummary(url, openaiApiKey);

      summaryDiv.innerHTML = summary;
      summaryDiv.style.display = "block";
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
