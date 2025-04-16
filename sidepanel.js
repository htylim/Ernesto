import { ErnestoApp } from "./ernestoApp.js";
import { getColorTheme, applyColorTheme } from "./colorThemeManager.js";

// Apply color theme
async function loadColorTheme() {
  try {
    const colors = await getColorTheme();
    applyColorTheme(colors);
  } catch (error) {
    console.error("Error loading color theme:", error);
  }
}

// Listen for color theme changes
function setupColorThemeListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "colorThemeChanged" && message.colors) {
      console.log("Received color theme change:", message.colors);
      applyColorTheme(message.colors);
      sendResponse({ success: true });
    }
    return true; // Keep the messaging channel open for async responses
  });
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load color theme first
    await loadColorTheme();

    // Set up listener for theme changes
    setupColorThemeListener();

    // Then initialize the application
    new ErnestoApp();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});
