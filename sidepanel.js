import { ErnestoApp } from "./ernestoApp.js";
import { getColorTheme, applyColorTheme } from "./colorThemeManager.js";

// Utility function to extract domain from URL
function getDomainFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    // Handle special chrome/edge URLs
    if (url.protocol === "chrome:" || url.protocol === "edge:") {
      return url.protocol + "//" + url.hostname;
    }
    // For file URLs, maybe return null or a special indicator?
    if (url.protocol === "file:") {
      return null; // Or 'local_file'
    }
    // Standard domain extraction
    return url.hostname.replace(/^www\./, ""); // Remove www.
  } catch (e) {
    console.error("Error parsing URL:", urlString, e);
    return null; // Return null if URL is invalid
  }
}

// Apply color theme based on the current tab's domain
async function loadAndApplyColorTheme() {
  try {
    // Get the current active tab in the current window
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const domain = tab && tab.url ? getDomainFromUrl(tab.url) : null;
    console.log(`Applying theme for domain: ${domain || "default"}`);
    const colors = await getColorTheme(domain); // Pass domain (or null) to get the correct theme
    applyColorTheme(colors);
  } catch (error) {
    console.error("Error loading or applying color theme:", error);
    // Apply default theme as a fallback in case of error?
    // applyColorTheme(DEFAULT_COLORS); // Requires importing DEFAULT_COLORS
  }
}

// Listen for color theme changes (generic notification)
function setupColorThemeListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "colorThemeChanged") {
      console.log(
        "Received color theme change notification. Reloading theme for current tab."
      );
      // Reload the theme based on the current tab's domain
      loadAndApplyColorTheme();
      // We don't have an immediate result to send back, maybe just acknowledge?
      // sendResponse({ success: true }); // Optional: acknowledge receipt
      return true; // Indicate potential async response (though we don't use sendResponse here)
    }
    return true; // Keep the messaging channel open for other listeners
  });
}

// Listen for tab activation changes
function setupTabActivationListener() {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // activeInfo contains windowId and tabId
    console.log(`Tab activated: ${activeInfo.tabId}. Reloading theme.`);
    // The side panel is implicitly associated with the active tab in the current window
    // when opened via chrome.action. No need to pass tabId explicitly here.
    await loadAndApplyColorTheme();
  });
  // Also listen for window focus changes, as the active tab might change implicitly
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      // Query the active tab in the newly focused window
      const [tab] = await chrome.tabs.query({
        active: true,
        windowId: windowId,
      });
      if (tab) {
        console.log(
          `Window focused: ${windowId}, active tab: ${tab.id}. Reloading theme.`
        );
        await loadAndApplyColorTheme();
      }
    }
  });
}

// Listen for tab URL updates
function setupTabUpdateListener() {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check if the URL changed and if the tab is the active one in the current window
    if (
      changeInfo.url &&
      tab.active &&
      tab.windowId === chrome.windows.WINDOW_ID_CURRENT
    ) {
      console.log(
        `URL updated in active tab ${tabId} to ${changeInfo.url}. Reloading theme.`
      );
      await loadAndApplyColorTheme();
    }
  });
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load and apply the correct color theme first
    await loadAndApplyColorTheme();

    // Set up listener for theme changes
    setupColorThemeListener();
    // Set up listener for tab/window activation
    setupTabActivationListener();
    // Set up listener for tab URL updates
    setupTabUpdateListener();

    // Then initialize the application
    new ErnestoApp();
  } catch (error) {
    console.error("Error initializing side panel:", error);
  }
});
