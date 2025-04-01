// Log API key when extension loads
chrome.storage.local.get(["openaiApiKey"], (result) => {
  console.log("Current API Key:", result.openaiApiKey);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.openaiApiKey) {
    console.log("API Key changed:", changes.openaiApiKey.newValue);
  }
});
