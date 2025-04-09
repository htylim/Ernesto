import { ErnestoApp } from "./ernestoApp.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  try {
    new ErnestoApp();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});
