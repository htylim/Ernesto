// Default color values
export const DEFAULT_COLORS = {
  mainAccentColor: "#0066cc",
  hoverColor: "#0052a3",
  disabledColor: "#004d99",
  summaryBgColor: "#f0f7ff",
};

// NEW Storage key for domain-specific and default themes
const DOMAIN_COLORS_STORAGE_KEY = "domain_color_themes";

/**
 * Color theme structure
 * @typedef {Object} ColorTheme
 * @property {string} mainAccentColor - Main accent color for buttons and interactive elements
 * @property {string} hoverColor - Color for hover states of buttons
 * @property {string} disabledColor - Color for disabled state of buttons
 * @property {string} summaryBgColor - Background color for the summary section
 */

/**
 * Structure for storing domain-specific themes
 * @typedef {Object} DomainColorThemes
 * @property {ColorTheme} default - The default theme
 * @property {Object.<string, ColorTheme>} domains - Dictionary of domain-specific themes
 */

/**
 * Retrieves the entire domain themes structure from storage.
 * Initializes with defaults if not found.
 * @returns {Promise<DomainColorThemes>} The domain themes structure.
 */
export async function getDomainThemesStructure() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DOMAIN_COLORS_STORAGE_KEY, (result) => {
      let themes = result[DOMAIN_COLORS_STORAGE_KEY];
      if (!themes || !themes.default || !themes.domains) {
        // Initialize if structure is missing or invalid
        themes = {
          default: DEFAULT_COLORS,
          domains: {},
        };
        // Optionally save the initialized structure back,
        // but migration script should handle initial setup.
        // chrome.storage.local.set({ [DOMAIN_COLORS_STORAGE_KEY]: themes });
      }
      resolve(themes);
    });
  });
}

/**
 * Saves the entire domain themes structure to storage.
 * @param {DomainColorThemes} themes - The themes object to save.
 * @returns {Promise<void>}
 */
async function saveDomainThemesStructure(themes) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [DOMAIN_COLORS_STORAGE_KEY]: themes }, resolve);
  });
}

/**
 * Get the appropriate color theme for a given domain.
 * Falls back to the default theme if no specific theme is found for the domain.
 * @param {string} [domain] - Optional domain name. If omitted or no theme is found, returns the default theme.
 * @returns {Promise<ColorTheme>} The resolved color theme object.
 */
export async function getColorTheme(domain) {
  const themes = await getDomainThemesStructure();
  if (domain && themes.domains[domain]) {
    return themes.domains[domain];
  }
  return themes.default;
}

/**
 * Get the current default color theme.
 * @returns {Promise<ColorTheme>} The default color theme object.
 */
export async function getDefaultColorTheme() {
  const themes = await getDomainThemesStructure();
  return themes.default;
}

/**
 * Save the default color theme.
 * @param {ColorTheme} theme - The color theme object to set as default.
 * @returns {Promise<void>}
 */
export async function setDefaultColorTheme(theme) {
  const themes = await getDomainThemesStructure();
  themes.default = theme;
  await saveDomainThemesStructure(themes);
}

/**
 * Save a color theme for a specific domain.
 * @param {string} domain - The domain name.
 * @param {ColorTheme} theme - The color theme object.
 * @returns {Promise<void>}
 */
export async function setDomainColorTheme(domain, theme) {
  if (!domain) throw new Error("Domain cannot be empty");
  const themes = await getDomainThemesStructure();
  themes.domains[domain] = theme;
  await saveDomainThemesStructure(themes);
}

/**
 * Remove the color theme for a specific domain.
 * @param {string} domain - The domain name.
 * @returns {Promise<void>}
 */
export async function removeDomainColorTheme(domain) {
  if (!domain) throw new Error("Domain cannot be empty");
  const themes = await getDomainThemesStructure();
  if (themes.domains[domain]) {
    delete themes.domains[domain];
    await saveDomainThemesStructure(themes);
  }
}

/**
 * Reset the default theme to the hardcoded default values.
 * @returns {Promise<ColorTheme>} The default colors that were set.
 */
export async function resetDefaultColorTheme() {
  await setDefaultColorTheme(DEFAULT_COLORS);
  return DEFAULT_COLORS;
}

/**
 * Apply the color theme to the document root as CSS variables.
 * (This function remains unchanged in its core logic)
 * @param {ColorTheme} colors - The color theme object to apply.
 */
export function applyColorTheme(colors) {
  const root = document.documentElement;
  // Ensure colors object is valid, fallback to defaults if not
  const safeColors =
    colors && typeof colors === "object" ? colors : DEFAULT_COLORS;
  root.style.setProperty(
    "--main-accent-color",
    safeColors.mainAccentColor || DEFAULT_COLORS.mainAccentColor
  );
  root.style.setProperty(
    "--hover-color",
    safeColors.hoverColor || DEFAULT_COLORS.hoverColor
  );
  root.style.setProperty(
    "--disabled-color",
    safeColors.disabledColor || DEFAULT_COLORS.disabledColor
  );
  root.style.setProperty(
    "--summary-bg-color",
    safeColors.summaryBgColor || DEFAULT_COLORS.summaryBgColor
  );
}
