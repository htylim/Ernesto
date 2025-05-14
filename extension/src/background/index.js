/**
 * Background script for the Ernesto Chrome extension
 * Entry point for extension initialization
 */

import { ErnestoApp } from "../core/ernestoApp.js";

// Initialize the extension
const ernestoApp = new ErnestoApp();
ernestoApp.init(); 