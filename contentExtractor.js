/**
 * Content extraction module - processes HTML with Readability and Turndown
 * Runs in the extension context, not in content scripts
 */

/**
 * @typedef {Object} PageMetadata
 * @property {string} title - The title of the webpage
 * @property {string} url - The URL of the webpage
 * @property {string} siteName - The name of the website/domain
 */

/**
 * @typedef {Object} ProcessedContent
 * @property {string} title - The extracted article title (from Readability or metadata)
 * @property {string} url - The URL of the webpage (from metadata)
 * @property {string} siteName - The name of the website (from Readability or metadata)
 * @property {string} excerpt - A short excerpt/summary of the article (if available)
 * @property {string} content - The main article content (in markdown or text format)
 * @property {string} contentType - Format of the content ('markdown' or 'text')
 */

/**
 * Extract the main article content from HTML using Readability and convert to Markdown
 * @param {string} htmlContent - The raw HTML content
 * @param {PageMetadata} metadata - Metadata about the page (title, url, etc.)
 * @returns {Promise<ProcessedContent>} - Processed content with metadata
 */
export async function extractArticleContent(htmlContent, metadata) {
  try {
    // Create a DOM parser to handle the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Check if the required libraries are available
    if (!checkRequiredLibraries()) {
      console.warn(
        "Required libraries not found, falling back to simple extraction"
      );
      return await extractArticleFallback(htmlContent, metadata);
    }

    // Use Readability to extract the article content
    try {
      const reader = new Readability(doc);
      const article = reader.parse();

      if (!article || !article.content) {
        throw new Error("Readability couldn't extract content");
      }

      // Convert the HTML content to Markdown
      // Get TurndownService from wherever it's exposed
      const TurndownServiceClass =
        TurndownService ||
        window.TurndownService ||
        (window.turndown && window.turndown.default);

      if (!TurndownServiceClass) {
        throw new Error("TurndownService not found");
      }

      const turndownService = new TurndownServiceClass({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
      });

      // Customize Turndown for better results
      turndownService.addRule("emphasis", {
        filter: ["em", "i"],
        replacement: function (content) {
          return "_" + content + "_";
        },
      });

      const markdown = turndownService.turndown(article.content);

      // Return the processed content with metadata
      return {
        title: article.title || metadata.title,
        url: metadata.url,
        siteName: article.siteName || metadata.siteName,
        excerpt: article.excerpt || "",
        content: markdown,
        contentType: "markdown",
      };
    } catch (error) {
      console.error("Error using Readability:", error);
      return await extractArticleFallback(htmlContent, metadata);
    }
  } catch (error) {
    console.error("Error processing content:", error);
    // Fall back to simpler extraction if anything fails
    return await extractArticleFallback(htmlContent, metadata);
  }
}

/**
 * Check if all required libraries are available in the global scope
 * @returns {boolean} True if all libraries are available, false otherwise
 */
function checkRequiredLibraries() {
  // Check for DOMPurify (required by Readability)
  const hasDOMPurify =
    typeof DOMPurify !== "undefined" || typeof window.DOMPurify !== "undefined";

  // Check for Readability
  const hasReadability =
    typeof Readability !== "undefined" ||
    typeof window.Readability !== "undefined" ||
    (typeof window.readability !== "undefined" &&
      typeof window.readability.Readability !== "undefined");

  // Check for TurndownService
  const hasTurndown =
    typeof TurndownService !== "undefined" ||
    typeof window.TurndownService !== "undefined" ||
    (typeof window.turndown !== "undefined" &&
      typeof window.turndown.default !== "undefined");

  if (!hasDOMPurify) console.error("DOMPurify library not found");
  if (!hasReadability) console.error("Readability library not found");
  if (!hasTurndown) console.error("Turndown library not found");

  return hasDOMPurify && hasReadability && hasTurndown;
}

/**
 * Fallback content extraction when Readability fails
 * Uses simpler DOM traversal to find article content
 * @param {string} htmlContent - The raw HTML content
 * @param {PageMetadata} metadata - Metadata about the page
 * @returns {Promise<ProcessedContent>} - Processed content with metadata
 */
async function extractArticleFallback(htmlContent, metadata) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Try to find the article element using common selectors
    const selectors = [
      "article",
      '[role="article"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      ".content-article",
      ".article-body",
      ".story-body",
      "main",
      "#content",
      ".content",
    ];

    let articleElement;

    // Find the first matching element
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      for (const element of elements) {
        // Check if this element contains enough text to be an article
        if (element.textContent.length > 500) {
          articleElement = element;
          break;
        }
      }
      if (articleElement) break;
    }

    // If no article element found, use a fallback approach
    if (!articleElement) {
      // Find the element with the most text content as a fallback
      articleElement = findElementWithMostText(doc.body);
    }

    // Clean up the content
    const cleanedContent = cleanArticleContent(articleElement);

    // Return the processed content with metadata
    return {
      title: metadata.title,
      url: metadata.url,
      siteName: metadata.siteName,
      content: cleanedContent,
      contentType: "text",
    };
  } catch (error) {
    console.error("Error in fallback extraction:", error);
    // If all else fails, return the metadata with empty content
    return {
      title: metadata.title,
      url: metadata.url,
      siteName: metadata.siteName,
      content: "Could not extract article content.",
      contentType: "text",
    };
  }
}

/**
 * Clean article content by removing unwanted elements
 * @param {Element} element - The article element to clean
 * @returns {string} - Cleaned text content
 */
function cleanArticleContent(element) {
  if (!element) return "";

  // Create a deep clone to avoid modifying the original DOM
  const clone = element.cloneNode(true);

  // Remove unwanted elements
  const unwantedSelectors = [
    "script",
    "style",
    "iframe",
    "noscript",
    "svg",
    ".ad",
    ".ads",
    ".advertisement",
    ".social",
    ".share",
    ".sharing",
    ".comments",
    ".comment-section",
    "nav",
    "header",
    "footer",
    ".nav",
    ".navbar",
    ".menu",
    ".sidebar",
    ".related",
    ".recommended",
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  // Get text content with basic formatting
  return getFormattedTextContent(clone);
}

/**
 * Format element content with basic markdown-style formatting
 * @param {Element} element - The element to format
 * @returns {string} - Formatted text content
 */
function getFormattedTextContent(element) {
  let content = "";

  // Process the element's child nodes
  Array.from(element.childNodes).forEach((node) => {
    // Text node - add its text
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) content += text + " ";
    }
    // Element node - process based on tag
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Handle headings, paragraphs and lists differently
      if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
        content += "\n\n## " + node.textContent.trim() + "\n\n";
      } else if (tagName === "p") {
        content += "\n\n" + getFormattedTextContent(node) + "\n\n";
      } else if (tagName === "li") {
        content += "\n- " + getFormattedTextContent(node);
      } else if (tagName === "br") {
        content += "\n";
      } else {
        content += getFormattedTextContent(node);
      }
    }
  });

  // Clean up extra whitespace
  return content.replace(/\s+/g, " ").trim();
}

/**
 * Find the element with the most text content (likely the article body)
 * @param {Element} rootElement - The root element to search from
 * @returns {Element} - The element with the most text
 */
function findElementWithMostText(rootElement) {
  let bestElement = null;
  let maxTextLength = 0;

  // Exclude these elements from consideration
  const excludeTags = ["script", "style", "nav", "header", "footer"];

  function traverse(element, depth = 0) {
    if (!element || excludeTags.includes(element.tagName.toLowerCase())) {
      return;
    }

    let textLength = 0;
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        textLength += node.textContent.trim().length;
      }
    }

    // Also consider text in all descendants
    const totalText = element.textContent.length;

    // If this element has a good amount of text and more than we've seen
    if (totalText > 200 && totalText > maxTextLength) {
      maxTextLength = totalText;
      bestElement = element;
    }

    // Continue traversing
    for (const child of element.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(rootElement);
  return bestElement;
}
