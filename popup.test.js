/**
 * @jest-environment jsdom
 */

describe("Popup", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button data-testid="settings-button">Settings</button>
    `;
    require("./popup.js");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("opens options page when settings button is clicked", () => {
    document.querySelector('[data-testid="settings-button"]').click();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
