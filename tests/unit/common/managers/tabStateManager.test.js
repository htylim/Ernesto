import { TabStateManager } from "../../../../src/common/managers/tabStateManager.js";

describe("TabStateManager", () => {
  let tabStateManager;

  beforeEach(() => {
    tabStateManager = new TabStateManager();
  });

  test("constructor initializes with an empty map", () => {
    expect(tabStateManager.tabStates).toBeInstanceOf(Map);
    expect(tabStateManager.tabStates.size).toBe(0);
  });

  describe("getTabState", () => {
    test("should return initial state for a new tabId", () => {
      const tabId = 1;
      const initialState = {
        url: null,
        title: null,
        isLoading: false,
        loadingMessage: "",
      };
      expect(tabStateManager.getTabState(tabId)).toEqual(initialState);
      expect(tabStateManager.tabStates.get(tabId)).toEqual(initialState);
    });

    test("should return existing state for a known tabId", () => {
      const tabId = 2;
      const initialState = tabStateManager.getTabState(tabId);
      expect(tabStateManager.getTabState(tabId)).toBe(initialState); // Should return the same object reference
      expect(tabStateManager.tabStates.size).toBe(1); // Should not create a new entry
    });
  });

  describe("updateTabState", () => {
    test("should update the state for a given tabId", async () => {
      const tabId = 3;
      const updates = {
        url: "https://example.com",
        title: "Example Domain",
        isLoading: true,
        loadingMessage: "Loading...",
      };

      // Initialize state first
      tabStateManager.getTabState(tabId);

      await tabStateManager.updateTabState(tabId, updates);

      const expectedState = {
        url: "https://example.com",
        title: "Example Domain",
        isLoading: true,
        loadingMessage: "Loading...",
      };
      expect(tabStateManager.getTabState(tabId)).toEqual(expectedState);
    });

    test("should partially update the state", async () => {
      const tabId = 4;
      const initialUpdates = {
        url: "https://initial.com",
        title: "Initial Title",
        isLoading: false,
        loadingMessage: "Initial",
      };
      const partialUpdates = {
        isLoading: true,
        loadingMessage: "Updated loading message",
      };

      await tabStateManager.updateTabState(tabId, initialUpdates); // Update includes initialization
      await tabStateManager.updateTabState(tabId, partialUpdates);

      const expectedState = {
        url: "https://initial.com",
        title: "Initial Title",
        isLoading: true,
        loadingMessage: "Updated loading message",
      };
      expect(tabStateManager.getTabState(tabId)).toEqual(expectedState);
    });

    test("should initialize state if updateTabState is called before getTabState", async () => {
      const tabId = 5;
      const updates = {
        isLoading: true,
        loadingMessage: "Direct update",
      };

      await tabStateManager.updateTabState(tabId, updates);

      const expectedState = {
        url: null,
        title: null,
        isLoading: true,
        loadingMessage: "Direct update",
      };
      expect(tabStateManager.getTabState(tabId)).toEqual(expectedState);
      expect(tabStateManager.tabStates.has(tabId)).toBe(true);
    });
  });
});
