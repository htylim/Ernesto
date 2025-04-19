import { defineConfig } from "vitest/config";
import path from "path"; // Import path module
// import crypto from "crypto"; // No longer needed here

export default defineConfig({
  test: {
    // Use 'jsdom' for browser-like environment
    environment: "jsdom",
    // Run setup file before each test file
    setupFiles: ["./vitest.setup.js"],
    // Enable globals like describe, it, expect, vi
    globals: true,
    // Define test file pattern (optional, default is good)
    // include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      // Define @ alias to point to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
