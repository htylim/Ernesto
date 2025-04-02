/**
 * @jest-environment jsdom
 */

describe("Popup", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="openOptions">Settings</button>
    `;
    require("./popup.js");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("opens options page when settings button is clicked", () => {
    document.querySelector("#openOptions").click();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
