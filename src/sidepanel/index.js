import { ErnestoApp } from "../core/ernestoApp.js";
import {
  getColorTheme,
  applyColorTheme,
} from "../common/managers/colorThemeManager.js";

// Utility function to extract domain from URL
export function getDomainFromUrl(urlString) {
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
export async function loadAndApplyColorTheme() {
  try {
    // Get the current active tab in the current window
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const domain = tab && tab.url ? getDomainFromUrl(tab.url) : null;
    const colors = await getColorTheme(domain); // Pass domain (or null) to get the correct theme
    applyColorTheme(colors);
  } catch (error) {
    console.error("Error loading or applying color theme:", error);
  }
}

// Listen for color theme changes (generic notification)
export function setupColorThemeListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "colorThemeChanged") {
      // Reload the theme based on the current tab's domain
      loadAndApplyColorTheme();
      return true; // Indicate potential async response (though we don't use sendResponse here)
    }
    return true; // Keep the messaging channel open for other listeners
  });
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Set up listener for theme changes
    setupColorThemeListener();

    // Then initialize the application
    new ErnestoApp();
  } catch (error) {
    console.error("Error initializing side panel:", error);
  }
});
