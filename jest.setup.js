import { jest } from "@jest/globals";

// Mock Chrome API
globalThis.chrome = {
  storage: {
    local: {
      get: jest.fn((key) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    openOptionsPage: jest.fn(),
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([{ url: "https://example.com" }])),
  },
};
