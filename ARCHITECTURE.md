# Project Architecture

This document outlines the structure and purpose of the files and folders within the Ernesto Chrome Extension project.

## Root Directory

### Files

- `manifest.json`: The core configuration file for the Chrome Extension. It defines permissions, scripts (background, content, side panel), icons, options page, and other essential extension properties.
- `background.js`: The extension's service worker. It runs in the background, manages extension lifecycle events (like installation, updates), handles API key storage changes, configures the side panel, schedules periodic cache clearing, and listens for the extension icon click to open the side panel.
- `content.js`: The content script injected into web pages. It listens for messages from other parts of the extension (like the side panel) and responds with the basic HTML content and metadata (title, URL, site name) of the current page. It does minimal processing, leaving heavy lifting to other scripts.
- `options.html`: The HTML structure for the extension's options/settings page. It includes input fields for the OpenAI API key, controls for theme customization (color pickers), and buttons for cache management (purging summaries, audio, prompts).
- `options.js`: The JavaScript logic for the `options.html` page. It handles loading/saving the API key (using encryption), managing color theme settings (getting, setting, resetting, deriving colors, applying themes), clearing different types of caches (summaries, audio, prompts), updating cache size display, and managing the UI state of the options page.
- `sidepanel.html`: The HTML structure for the extension's side panel UI. This is the main user interface displayed when the extension icon is clicked. It includes buttons for summarizing, generating audio (speechify), asking questions (prompt), opening options, and closing the panel. It also contains areas to display the page title, loading indicators, the generated summary, prompt responses, and an audio player.
- `sidepanel.js`: The entry point script for the side panel. It initializes the main application logic (`ErnestoApp`), loads and applies the current color theme, and sets up listeners for theme changes broadcast from the options page.
- `ernestoApp.js`: The main application logic controller residing in the side panel. It orchestrates the core functionalities:
  - Initializes UI (`UIStateManager`), audio (`AudioController`), and tab state (`TabStateManager`).
  - Sets up event listeners for UI buttons (summarize, speechify, prompt, options, close).
  - Handles tab changes (activation, updates) to load the correct context and state.
  - Restores previous state (summary, prompts) for a tab when reopened.
  - Coordinates fetching page content via `content.js` and `contentExtractor.js`.
  - Calls `getSummary.js` to generate summaries via the OpenAI API, handles caching via `summariesCache.js`.
  - Calls `getSpeechifyAudio.js` to generate audio via the OpenAI API, handles caching via `speechifyCache.js`, and manages playback via `AudioController`.
  - Calls `getResponse.js` to handle user prompts/questions, maintains conversation history, and handles caching via `promptsCache.js`.
  - Displays loading states, results, and errors using `UIStateManager`.
- `uiStateManager.js`: Manages the state and updates of the side panel's UI (`sidepanel.html`). It provides methods to show/hide elements (loading indicators, summary, audio player, errors, prompt responses), update button states, set text content, manage prompt input/output, and reset the UI.
- `audioController.js`: Handles audio playback logic within the side panel. It manages the `Audio` element, controls play/pause/restart actions, updates UI button states based on playback status, sets up audio from a Blob, and handles cleanup.
- `getSummary.js`: Contains the function to call the OpenAI API (`/v1/responses` with specific instructions) to generate a summary for the provided page content. It constructs the prompt with detailed instructions for formatting the summary.
- `getSpeechifyAudio.js`: Contains the function to call the OpenAI API (`/v1/audio/speech`) to convert text (usually the summary) into speech (audio blob). It includes instructions for the TTS model (tone, pace, etc.).
- `getResponse.js`: Contains the function to call the OpenAI API (`/v1/responses` with web search tool) to get answers to user prompts related to the current page content. It manages conversation history by passing the `previous_response_id`.
- `contentExtractor.js`: Processes the raw HTML fetched by `content.js`. It uses the `Readability.js` library (if available) to extract the main article content from the HTML structure. If Readability fails or is unavailable, it uses fallback methods (searching common selectors, finding the element with the most text) and basic cleanup to extract content. It returns the processed content (HTML or text) along with metadata. This script runs in the extension context (likely side panel or background), not the content script context.
- `apiKeyManager.js`: Manages secure storage and retrieval of the OpenAI API key. It uses `cryptoUtils.js` to encrypt the key before saving it to `chrome.storage.local` and decrypt it when needed.
- `cryptoUtils.js`: Provides utility functions (`encryptValue`, `decryptValue`) for encrypting and decrypting strings using the Web Crypto API (AES-GCM). It generates a unique encryption key based on the extension's ID for security.
- `tabStateManager.js`: Manages the state associated with each browser tab (URL, title, loading status). It uses a `Map` to store the state keyed by `tabId`. This state is used by `ErnestoApp` to track context changes.
- `genericCache.js`: Implements a generic caching mechanism using `chrome.storage.local`. It supports time-to-live (TTL) for cache entries, custom key generation, serialization/deserialization, cache clearing (all or expired), and size calculation. It's used as the base for specific caches.
- `summariesCache.js`: A specific implementation of `GenericCache` for storing and retrieving page summaries, keyed by URL.
- `speechifyCache.js`: A specific implementation of `GenericCache` for storing and retrieving generated audio (as Blobs), keyed by URL. Includes custom serialization/deserialization to handle Blobs in `chrome.storage.local`.
- `promptsCache.js`: A specific implementation of `GenericCache` for storing and retrieving conversation history (prompts and responses) for a page, keyed by URL.
- `colorThemeManager.js`: Manages the color theme settings (main accent, hover, disabled, summary background). Provides functions to get, set, reset, and apply the theme colors using CSS variables. Used by `options.js` and `sidepanel.js`.
- `sidepanel-libraries.js`: Likely intended to load or manage external libraries specifically for the side panel, although its current content might be minimal or placeholder. `manifest.json` lists it as a web accessible resource.
- `library-test.html` / `library-test.js`: Appear to be test files, potentially for experimenting with or verifying the functionality of external libraries like Readability, Marked, DOMPurify, Turndown, etc., which are listed in `manifest.json` as web accessible resources.
- `package.json`: Standard Node.js manifest file defining project metadata, dependencies, and scripts. Indicates the project might use npm/Node.js for development tooling or dependency management, although the core extension is vanilla JS.
- `package-lock.json`: Automatically generated file that records the exact versions of dependencies installed. Ensures reproducible builds.
- `README.md`: Contains information about the project, setup instructions, features, etc. (This file is being read/written).
- `.gitignore`: Specifies intentionally untracked files that Git should ignore (e.g., `node_modules`, build artifacts, sensitive files).
- `.cursor.json`: Configuration file for the Cursor IDE/editor.

### Directories

- `icons/`: Contains the extension's icons (`icon16.png`, `icon48.png`, `icon128.png`) used in the browser UI (toolbar, extension management page).
- `vendor/`: Contains third-party libraries used by the extension (e.g., `marked.min.js`, `purify.min.js`, `readability.js`, `turndown.js` based on `manifest.json`). These are bundled directly instead of being installed via npm.
- `.git/`: Standard Git directory containing repository metadata and history (usually hidden).
- `node_modules/`: Contains Node.js dependencies installed via npm (usually ignored by Git as specified in `.gitignore`).
- `.cursor/`: Directory potentially used by the Cursor IDE for its own state or configuration related to the workspace.

## Flow Overview

1.  **Installation/Load:** `background.js` runs, sets up the side panel via `chrome.sidePanel.setOptions`, and schedules cache clearing.
2.  **User Interaction (Icon Click):** `background.js` listens for `chrome.action.onClicked` and opens `sidepanel.html`.
3.  **Side Panel Load:** `sidepanel.html` loads. `sidepanel.js` runs, applies the theme via `colorThemeManager.js`, and initializes `ErnestoApp`.
4.  **`ErnestoApp` Initialization:**
    - Creates instances of `UIStateManager`, `AudioController`, `TabStateManager`.
    - Sets up button listeners.
    - Calls `handleTabChange` to get the current tab info.
5.  **`handleTabChange`:**
    - Gets the active tab's URL and title.
    - Updates UI with tab info via `UIStateManager`.
    - Restores cached summary (`summariesCache.js`) and prompts (`promptsCache.js`) for the current URL via `restoreTabState`.
6.  **User Clicks "Summarize":**
    - `ErnestoApp` triggers the summarize flow.
    - Retrieves API key (`apiKeyManager.js`).
    - Requests page content from `content.js`.
    - `content.js` sends back raw HTML.
    - `contentExtractor.js` processes HTML using Readability/fallback.
    - Checks `summariesCache.js` for a cached summary.
    - If no cache, calls `getSummary.js` with content and API key.
    - `getSummary.js` calls OpenAI API.
    - Stores result in `summariesCache.js`.
    - Displays summary using `UIStateManager`.
7.  **User Clicks "Speechify":**
    - `ErnestoApp` triggers the speechify flow.
    - Retrieves API key.
    - Gets summary text from `UIStateManager`.
    - Checks `speechifyCache.js` for cached audio.
    - If no cache, calls `getSpeechifyAudio.js` with summary text and API key.
    - `getSpeechifyAudio.js` calls OpenAI TTS API.
    - Stores result (Blob) in `speechifyCache.js`.
    - Sets up `AudioController` with the audio Blob.
    - `UIStateManager` shows the audio player.
8.  **User Asks a Question:**
    - `ErnestoApp` triggers the prompt flow.
    - Retrieves API key.
    - Gets prompt text from `UIStateManager`.
    - Retrieves conversation history from `promptsCache.js`.
    - Calls `getResponse.js` with prompt, URL, API key, and previous response ID.
    - `getResponse.js` calls OpenAI API.
    - Stores updated conversation in `promptsCache.js`.
    - Displays response using `UIStateManager`.
9.  **Options Page:**
    - User opens `options.html`.
    - `options.js` loads API key (`apiKeyManager.js`) and theme (`colorThemeManager.js`).
    - User changes settings and saves.
    - `options.js` saves API key/theme, potentially clearing caches or notifying other parts of the extension (like the side panel for theme changes).
