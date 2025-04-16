// Default color values
const DEFAULT_COLORS = {
  mainAccentColor: "#0066cc",
  hoverColor: "#0052a3",
  disabledColor: "#004d99",
  summaryBgColor: "#f0f7ff",
};

// Storage key for colors
const COLORS_STORAGE_KEY = "ernesto_colors";

/**
 * Color theme structure
 * @typedef {Object} ColorTheme
 * @property {string} mainAccentColor - Main accent color for buttons and interactive elements
 * @property {string} hoverColor - Color for hover states of buttons
 * @property {string} disabledColor - Color for disabled state of buttons
 * @property {string} summaryBgColor - Background color for the summary section
 */

/**
 * Get the current color theme from storage or use defaults
 * @returns {Promise<ColorTheme>} The color theme object
 */
export async function getColorTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(COLORS_STORAGE_KEY, (result) => {
      const colors = result[COLORS_STORAGE_KEY] || DEFAULT_COLORS;
      resolve(colors);
    });
  });
}

/**
 * Save the color theme to storage
 * @param {ColorTheme} colors - The color theme object containing mainAccentColor, hoverColor, disabledColor, and summaryBgColor
 * @returns {Promise<void>}
 */
export async function setColorTheme(colors) {
  return new Promise((resolve) => {
    const data = {};
    data[COLORS_STORAGE_KEY] = colors;
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Reset colors to default values
 * @returns {Promise<ColorTheme>} The default colors
 */
export async function resetToDefaultColors() {
  await setColorTheme(DEFAULT_COLORS);
  return DEFAULT_COLORS;
}

/**
 * Apply the color theme to the document
 * @param {ColorTheme} colors - The color theme object containing mainAccentColor, hoverColor, disabledColor, and summaryBgColor
 */
export function applyColorTheme(colors) {
  const root = document.documentElement;
  root.style.setProperty("--main-accent-color", colors.mainAccentColor);
  root.style.setProperty("--hover-color", colors.hoverColor);
  root.style.setProperty("--disabled-color", colors.disabledColor);
  root.style.setProperty("--summary-bg-color", colors.summaryBgColor);
}
