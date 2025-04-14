/**
 * Content script for Ernesto Chrome Extension
 *
 * Handles message requests to extract page content
 * This script runs in the context of the web page and extracts
 * basic HTML and metadata only - all processing happens in the extension context
 */

/**
 * @typedef {Object} PageMetadata
 * @property {string} title - The title of the webpage
 * @property {string} url - The URL of the webpage
 * @property {string} siteName - The name of the website/domain
 */

/**
 * @typedef {Object} ContentResponse
 * @property {string} content - The full HTML content of the page
 * @property {PageMetadata} metadata - Basic metadata about the page
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message if content extraction failed
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "ready" });
    return true;
  }

  if (request.action === "getPageContent") {
    try {
      // Extract basic HTML and metadata - processing will happen in extension context
      const metadata = {
        title: document.title,
        url: window.location.href,
        siteName: getSiteName(),
      };

      // Get the HTML content - we'll process this in the extension context
      const content = document.documentElement.outerHTML;

      /** @type {ContentResponse} */
      const response = {
        content,
        metadata,
      };

      sendResponse(response);
    } catch (error) {
      console.error("Error in content script:", error);

      /** @type {ErrorResponse} */
      const errorResponse = { error: error.message };
      sendResponse(errorResponse);
    }
    return true; // Keep message channel open for async response
  }

  return true; // Keep message channel open for async response
});

/**
 * Extract the site name from meta tags or domain
 * @returns {string} The website name
 */
function getSiteName() {
  // Try to get the site name from meta tags
  const metaTags = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    'meta[property="twitter:site"]',
  ];

  for (const selector of metaTags) {
    const meta = document.querySelector(selector);
    if (meta && meta.content) {
      return meta.content;
    }
  }

  // Fallback to domain name
  return window.location.hostname;
}
