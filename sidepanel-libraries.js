/**
 * This script ensures all required libraries are properly loaded
 * in the sidepanel context before the main app starts
 */

// Check all libraries and log their status
function verifyLibraries() {
  const libraryStatus = {
    domPurify: false,
    readability: false,
  };

  // Check DOMPurify
  try {
    if (
      typeof DOMPurify !== "undefined" ||
      typeof window.DOMPurify !== "undefined"
    ) {
      const purify = DOMPurify || window.DOMPurify;
      console.log(
        `✅ DOMPurify loaded (version: ${purify.version || "unknown"})`
      );
      libraryStatus.domPurify = true;
    } else {
      console.error("❌ DOMPurify not found");
    }
  } catch (e) {
    console.error("❌ DOMPurify error:", e);
  }

  // Check Readability
  try {
    if (
      typeof Readability !== "undefined" ||
      typeof window.Readability !== "undefined" ||
      (typeof window.readability !== "undefined" &&
        typeof window.readability.Readability !== "undefined")
    ) {
      console.log("✅ Readability loaded");
      libraryStatus.readability = true;
    } else {
      console.error("❌ Readability not found");
    }
  } catch (e) {
    console.error("❌ Readability error:", e);
  }

  // Log overall status
  if (libraryStatus.domPurify && libraryStatus.readability) {
    console.log("✅ All libraries loaded successfully");
    return true;
  } else {
    console.error("❌ Some libraries failed to load", libraryStatus);
    return false;
  }
}

// Make the function available globally
window.verifyLibraries = verifyLibraries;

// Run verification once DOM is loaded
document.addEventListener("DOMContentLoaded", verifyLibraries);
