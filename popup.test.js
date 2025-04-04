/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";

jest.mock("./getSummary.js", () => ({
  getSummary: jest.fn(),
}));

jest.mock("./summariesCache.js", () => ({
  getCachedSummary: jest.fn(),
  cacheSummary: jest.fn(),
}));

describe("Popup", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="button-container">
        <button id="summarize">Summarize Article</button>
        <button id="speechify" disabled title="Coming soon: Listen to summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 6v12M8 9v6M16 9v6M20 12h0M4 12h0"/>
          </svg>
        </button>
        <button id="openOptions" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
      <div id="loading">
        <div class="spinner"></div>
        <p>Generating summary...</p>
      </div>
      <div id="summary"></div>
    `;
    await import("./popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("opens options page when settings button is clicked", () => {
    document.querySelector("#openOptions").click();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
