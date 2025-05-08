# Open & Summarize Context Menu Feature

## Phase 1: Setup & Context Menu

- [ ] **Update Manifest (`manifest.json`)**
  - [ ] Add `"contextMenus"` permission.
  - [ ] Define the context menu item (programmatically preferred).
- [ ] **Modify Background Script (`src/background/index.js`)**
  - [ ] On install (`chrome.runtime.onInstalled`), create the context menu item:
    - `chrome.contextMenus.create({ id: "openAndSummarize", title: "Open & Summarize", contexts: ["link"] });`
  - [ ] Add an `onClicked` listener for `chrome.contextMenus`.
  - [ ] Filter events for `menuItemId === "openAndSummarize"` and call navigation function (Phase 2).
  - [ ] **Add `chrome.tabs.onUpdated` listener** to handle triggering after navigation completes.
  - [ ] **(Optional but recommended):** Maintain a temporary structure (e.g., a `Map<number, { url: string }>`) in the background script scope to track tabs waiting for summarization trigger.
- [ ] **Test Context Menu Listener & Setup (`tests/unit/background/index.test.js` - _Create if not exists_)**
  - [ ] Test context menu creation on install (`chrome.runtime.onInstalled`).
  - [ ] Test `onClicked` listener: Mock `chrome.contextMenus.onClicked.addListener`. Simulate click. Assert navigation function (Phase 2) is called with correct `clickData` and `tab`.
  - [ ] Test `onUpdated` listener registration: Mock `chrome.tabs.onUpdated.addListener`. Verify it's called.

## Phase 2: Navigation & Triggering (Background Script)

- [ ] **Implement Navigation Function (`src/background/index.js`)**
  - [ ] Create a function (e.g., `initiateOpenAndSummarize(clickData, tab)`) called by the `onClicked` listener.
  - [ ] Inside, check `clickData.modifiers` for CMD/Ctrl key (`"MacCtrl"` or `"Ctrl"`).
  - [ ] **Navigation Logic:**
    - If modifier pressed: Call `chrome.tabs.create({ url: clickData.linkUrl, active: true })`.
    - If modifier not pressed: Call `chrome.tabs.update(tab.id, { url: clickData.linkUrl })`.
  - [ ] **Prepare for Trigger:**
    - Get the target tab ID (from `create` result or `tab.id` for update).
    - Store the `targetTabId` and the target `url` (from `clickData.linkUrl`) in the temporary tracking structure (e.g., `tabsToSummarize.set(targetTabId, { url: clickData.linkUrl })`).
- [ ] **Implement Trigger Logic in `onUpdated` Listener (`src/background/index.js`)**
  - [ ] Inside the `chrome.tabs.onUpdated` listener:
    - Check if `changeInfo.status === 'complete'` and if the `tabId` exists in `tabsToSummarize`.
    - If both are true:
      - Retrieve the target `url` from `tabsToSummarize`.
      - Open the side panel: `chrome.sidePanel.open({ tabId: tabId })`.
      - Send message to the extension: `chrome.runtime.sendMessage({ action: "summarizeUrl", url: url, tabId: tabId })`.
      - Remove the entry from `tabsToSummarize`: `tabsToSummarize.delete(tabId)`.
- [ ] **Test Navigation & Triggering (`tests/unit/background/index.test.js`)**
  - [ ] Test `initiateOpenAndSummarize` function:
    - Mock `chrome.tabs.create` and `chrome.tabs.update`.
    - Verify correct navigation call based on modifier.
    - Verify the `targetTabId` and `url` are correctly stored in the mocked tracking structure.
  - [ ] Test `onUpdated` listener logic:
    - Mock `chrome.sidePanel.open` and `chrome.runtime.sendMessage`.
    - Simulate `onUpdated` event with `status: 'complete'` for a tracked tab ID.
    - Assert `sidePanel.open` is called with the correct `tabId`.
    - Assert `runtime.sendMessage` is called with `{ action: "summarizeUrl", url: expectedUrl, tabId: expectedTabId }`.
    - Assert the entry is removed from the mocked tracking structure.
    - Simulate `onUpdated` event with `status: 'loading'` -> Assert nothing happens.
    - Simulate `onUpdated` event for an untracked tab ID -> Assert nothing happens.

## Phase 3: Side Panel Auto-Summarization & Refactor (Side Panel)

- [ ] **Refactor Core Logic (`src/core/ernestoApp.js`)**
  - [ ] Modify `ErnestoApp.getPageContent` to accept optional `targetTabId`:
    - `async getPageContent(targetTabId = null)`
    - If `targetTabId` is null, get current tab ID as before.
    - Use the determined `tabId` to message the content script (`chrome.tabs.sendMessage(theTabId, ...)`).
    - Ensure it handles potential errors if the content script isn't ready for the specified `targetTabId` (may need `executeScript` logic similar to original, but targeted).
  - [ ] Modify `ErnestoApp.summarize` to accept optional `urlToSummarize` and `tabIdForContent`:
    - `async summarize(urlToSummarize = null, tabIdForContent = null)`
    - Determine the `url` to use: `urlToSummarize` if provided, otherwise get current tab URL.
    - Call `this.getPageContent(tabIdForContent)` passing the relevant tab ID.
    - Use the determined `url` for caching (`getCachedSummary`, `cacheSummary`).
    - Update UI based on the _current active tab_ context, only if the summarized `url` matches the active tab's URL at the end.
- [ ] **Implement Message Handling (`src/core/ernestoApp.js`)**
  - [ ] Add a `chrome.runtime.onMessage` listener (e.g., in `setupEventListeners` or `constructor`).
  - [ ] Inside the listener:
    - Check if `message.action === "summarizeUrl"`.
    - If yes, call `this.summarize(message.url, message.tabId)`.
    - Ensure the side panel's active tab context (`this.getCurrentTab`) is checked _before_ updating the UI inside `summarize` to prevent updating the wrong panel.
- [ ] **Test Refactored Methods (`tests/unit/core/ernestoApp.test.js`)**
  - [ ] Update tests for `getPageContent`:
    - Test calling with `targetTabId` -> asserts `tabs.sendMessage` uses the provided `tabId`.
    - Test calling without `targetTabId` -> asserts `tabs.sendMessage` uses the mocked current tab ID.
  - [ ] Update tests for `summarize`:
    - Test calling with `urlToSummarize` and `tabIdForContent` -> asserts `getPageContent` is called with `tabIdForContent`, caching uses `urlToSummarize`, UI update checks against active tab.
    - Test calling without arguments -> asserts `getPageContent` uses current tab ID, caching uses current tab URL.
- [ ] **Test Side Panel Message Handling (`tests/unit/core/ernestoApp.test.js`)**
  - [ ] Test the `runtime.onMessage` listener setup.
  - [ ] Mock `chrome.runtime.onMessage.addListener`.
  - [ ] Mock `this.summarize` (use `vi.spyOn`).
  - [ ] Simulate receiving `{ action: "summarizeUrl", url: testUrl, tabId: testTabId }` -> Assert `this.summarize` IS called with `testUrl` and `testTabId`.
  - [ ] Simulate receiving message with different `action` -> Assert `this.summarize` is NOT called.

## Phase 4: Refinement & Documentation

- [ ] **Code Review & Refactoring**
  - [ ] Review refactored `summarize` and `getPageContent` for clarity and correctness.
  - [ ] Ensure UI updates in `summarize` only happen if the side panel context matches the summarized URL/tab.
  - [ ] Refactor as needed.
- [ ] **Manual Testing**
  - [ ] Perform manual end-to-end testing:
    - Test right-click -> Open & Summarize (no modifier).
    - Test right-click + CMD/Ctrl -> Open & Summarize (new tab).
    - Test summarizing manually via button after context menu trigger.
    - Test context menu trigger while side panel is open on a _different_ tab -> ensure correct tab is summarized and UI updates only if panel switches to that tab.
- [ ] **Update Documentation**
  - [ ] Update `README.md`.
  - [ ] Update `ARCHITECTURE.md` (diagram and description, mention parameter passing).
