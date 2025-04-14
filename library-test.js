// This script checks if our libraries loaded properly
document.addEventListener("DOMContentLoaded", function () {
  const results = document.getElementById("results");

  // Check DOMPurify
  try {
    if (
      typeof DOMPurify === "undefined" &&
      typeof window.DOMPurify === "undefined"
    ) {
      results.innerHTML += '<p style="color: red">DOMPurify not loaded</p>';
    } else {
      const purify = DOMPurify || window.DOMPurify;
      results.innerHTML += `<p style="color: green">DOMPurify loaded (version: ${
        purify.version || "unknown"
      })</p>`;
    }
  } catch (e) {
    results.innerHTML += `<p style="color: red">DOMPurify error: ${e.message}</p>`;
  }

  // Check Readability
  try {
    if (
      typeof Readability === "undefined" &&
      typeof window.Readability === "undefined" &&
      !(window.readability && window.readability.Readability)
    ) {
      results.innerHTML += '<p style="color: red">Readability not loaded</p>';
    } else {
      const ReadabilityClass =
        Readability ||
        window.Readability ||
        (window.readability && window.readability.Readability);
      results.innerHTML += `<p style="color: green">Readability loaded</p>`;
    }
  } catch (e) {
    results.innerHTML += `<p style="color: red">Readability error: ${e.message}</p>`;
  }

  // Check TurndownService
  try {
    if (
      typeof TurndownService === "undefined" &&
      typeof window.TurndownService === "undefined" &&
      !(window.turndown && window.turndown.default)
    ) {
      results.innerHTML +=
        '<p style="color: red">TurndownService not loaded</p>';
    } else {
      const TurndownClass =
        TurndownService ||
        window.TurndownService ||
        (window.turndown && window.turndown.default);

      // Try creating an instance
      const td = new TurndownClass();
      const sample = td.turndown("<p>Test</p>");

      results.innerHTML += `<p style="color: green">TurndownService loaded: "${sample}"</p>`;
    }
  } catch (e) {
    results.innerHTML += `<p style="color: red">TurndownService error: ${e.message}</p>`;
  }
});
