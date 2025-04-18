// Jest setup file

// Keep chrome.runtime mock as it's extension specific
global.chrome = {
  runtime: {
    id: "test-extension-id",
  },
};

// Remove crypto mocks, TextEncoder/Decoder polyfills, btoa/atob mocks
// as the Puppeteer browser environment provides these natively.
