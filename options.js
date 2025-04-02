document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.querySelector("#apiKey");
  const saveButton = document.querySelector("#save");
  const cancelButton = document.querySelector("#cancel");

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
});
