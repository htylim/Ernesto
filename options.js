document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.querySelector('[data-testid="api-key-input"]');
  const saveButton = document.querySelector('[data-testid="save-button"]');
  const cancelButton = document.querySelector('[data-testid="cancel-button"]');

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
