# Project structure

```
src/
  ├── background/       # Service worker managing extension lifecycle events, side panel setup, background tasks, and theme migrations.
  ├── common/api/       # functions for calling APIs used in the extension 
  ├── common/cache/     # Storage caches for the extension use of chrome.storage.local
  ├── common/crypto/    # crypto utilities for sensitive data like API keys
  ├── common/managers/  # various managers (apiKeyManager, colorThemeManager and tabStateManager)
  ├── common/ui/        # UI element controllers (audio controller)
  ├── content/          # Content script injected into pages (used to extract basic HTML and metadata from the visited page)
  ├── core/             # Extension main components 
  ├── options/          # Setting page implementation
  ├── sidepanel/        # Sidepanel UI implementation
  └── vendor/           # Third-party libraries
tests/                  # Tests root directory
public/icons/           # Contains extension icons (`icon16.png`, `icon48.png`, `icon128.png`)
ARCHITECTURE.md         # This file, outlining the project structure and conventions.
README.md               # Project documentation (setup, features).
manifest.json           # Core Chrome Extension configuration file (permissions, scripts, icons, etc.).
package.json            # Node.js project configuration.
vitest.config.js        # itest configuration file.
vitest.setup.js         # Vitest global setup file.
```


# Tech Stack

- **Browser:** Chrome (Manifest V3)
- **Languages:** JavaScript (ES Modules)
- **UI:** HTML, CSS (side panel, options page)
- **APIs:** OpenAI (summarization, Q&A, TTS)
- **Testing:** Vitest (unit tests, jsdom environment)
- **Build/Dev:** Node.js, npm
- **Security:** AES-GCM encryption for sensitive data (API keys)
- **Libraries:**  (`.min.js` included in the project under `/src/vendor/`)
  - [Marked](https://github.com/markedjs/marked) (Markdown parsing)
  - [Readability.js](https://github.com/mozilla/readability) (Content extraction)
  - [DOMPurify](https://github.com/cure53/DOMPurify) (HTML sanitization)
  - [Turndown](https://github.com/mixmark-io/turndown) (HTML to Markdown)


# Naming Conventions

- **Classes:** `PascalCase` (e.g., `ErnestoApp`, `UIStateManager`).
- **Functions/Variables:** `camelCase` (e.g., `getApiKey`, `extractArticleContent`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `LOADING_MESSAGES`).
- **Types:** `PascalCase` for TypeScript types (if present).
- **Exports:** Named exports for utilities and classes.
- **Files & Folders:**
  - `camelCase` for JavaScript files (e.g., `getSummary.js`, `colorThemeManager.js`).
  - `kebab-case` for HTML files (e.g., `index.html`).
  - lowercase for directories (e.g., `core/`, `common/`, `sidepanel/`).
  - Test files mirror source structure and use `.test.js` suffix. Example:
    - this src file: `src/common/crypto/cryptoUtils.js`
    - gets this est file: `tests/unit/common/crypto/crytoUtils.test.js`


# Testing Conventions

- **Framework:** [Vitest](https://vitest.dev/) (with jsdom environment)
- **Test File Location:**
  - All unit tests are under `tests/unit/` mirroring the source structure.
  - Example: `src/common/crypto/cryptoUtils.js` → `tests/unit/common/crypto/cryptoUtils.test.js`
- **Naming:**
  - Test files use `.test.js` suffix.
  - Test suites and cases use descriptive names.
- **Setup:**
  - Global mocks and polyfills for browser APIs (like `chrome`) should be defined in `vitest.setup.js`.
- **Practices:**
  - Each new feature or logic change must include or update a corresponding test.
  - Run `npm test` after each step/change to ensure all tests pass.
  - Remove unused code (do not comment out).
  - Use mocks for browser and crypto APIs as needed.
  - ⚠️ **Prefer global mocks from `vitest.setup.js`. Avoid redefining global objects (e.g., `global.chrome`) directly in individual test files, as this can override the comprehensive global setup and lead to hard-to-debug errors. If a test requires specific behavior from a mocked function, use `vi.spyOn` or `vi.fn().mockImplementationOnce()` on the globally mocked object for that test case.**
  - ⚠️ **When working with existing test files, check for local redefinitions of global mocks (e.g., a local `global.chrome = ...`). If found, consider refactoring to remove the local mock and rely on the global setup in `vitest.setup.js`, ensuring the global mock covers the necessary functionality.**
- **Coverage:**
  - Cover encryption, caching, API calls, UI state, and error handling.
