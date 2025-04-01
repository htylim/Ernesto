document
  .querySelector('[data-testid="settings-button"]')
  .addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
