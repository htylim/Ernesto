document.addEventListener("DOMContentLoaded", () => {
  // Load saved API key
  chrome.storage.local.get(["openaiApiKey"], (result) => {
    if (result.openaiApiKey) {
      document.getElementById("apiKey").value = result.openaiApiKey;
    }
  });

  // Save button handler
  document.getElementById("save").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
      console.log("API Key saved:", apiKey);
      window.close();
    });
  });

  // Cancel button handler
  document.getElementById("cancel").addEventListener("click", () => {
    window.close();
  });
});
