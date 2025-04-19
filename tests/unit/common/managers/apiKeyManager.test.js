/**
 * @jest-environment jsdom
 */
// import { jest } from "@jest/globals"; // REMOVED
// Use Vitest globals
import { vi } from "vitest"; // Import vi

// Use vi.mock before importing the modules that depend on it
vi.mock("../../../../src/common/crypto/cryptoUtils.js", () => ({
  encryptValue: vi.fn(),
  decryptValue: vi.fn(),
}));

// Now import the modules AFTER mocking
const cryptoUtils = await import(
  "../../../../src/common/crypto/cryptoUtils.js"
);
const { getApiKey, setApiKey } = await import(
  "../../../../src/common/managers/apiKeyManager.js"
);

const STORAGE_KEY = "encryptedApiKey";
const TEST_API_KEY = "test-api-key-123";
const MOCK_ENCRYPTED_KEY = "encrypted-key-data";

describe("apiKeyManager", () => {
  let mockStorageGet;
  let mockStorageSet;

  beforeEach(() => {
    // Reset mocks and setup chrome.storage mock for each test
    vi.clearAllMocks();

    mockStorageGet = vi.fn();
    mockStorageSet = vi.fn();

    global.chrome = {
      storage: {
        local: {
          get: mockStorageGet,
          set: mockStorageSet,
        },
      },
      runtime: {
        // Needed by cryptoUtils mocks sometimes
        id: "test-extension-id",
      },
    };

    // Default mock implementations using the correctly typed mocks
    cryptoUtils.encryptValue.mockResolvedValue(MOCK_ENCRYPTED_KEY);
    cryptoUtils.decryptValue.mockResolvedValue(TEST_API_KEY);
    mockStorageGet.mockImplementation((keys, callback) => {
      if (keys.includes(STORAGE_KEY)) {
        const result = { [STORAGE_KEY]: MOCK_ENCRYPTED_KEY };
        if (typeof callback === "function") {
          callback(result); // Call callback for older chrome versions
        }
        return Promise.resolve(result); // Return promise for newer versions
      }
      const result = {};
      if (typeof callback === "function") {
        callback(result);
      }
      return Promise.resolve(result);
    });
    mockStorageSet.mockImplementation((items, callback) => {
      if (typeof callback === "function") {
        callback(); // Call callback for older chrome versions
      }
      return Promise.resolve(); // Return promise for newer versions
    });
  });

  describe("getApiKey", () => {
    test("should retrieve and decrypt the API key successfully", async () => {
      const apiKey = await getApiKey();

      expect(apiKey).toBe(TEST_API_KEY);
      expect(mockStorageGet).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(cryptoUtils.decryptValue).toHaveBeenCalledWith(MOCK_ENCRYPTED_KEY);
    });

    test("should throw error if API key is not found in storage", async () => {
      mockStorageGet.mockImplementation((keys, callback) => {
        const result = {}; // Simulate key not found
        if (typeof callback === "function") {
          callback(result);
        }
        return Promise.resolve(result);
      });

      await expect(getApiKey()).rejects.toThrow(
        "API key not found or could not be decrypted. Please reset it in settings."
      );
      expect(mockStorageGet).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(cryptoUtils.decryptValue).not.toHaveBeenCalled();
    });

    test("should throw error if decryption fails", async () => {
      const decryptionError = new Error("Decryption failed");
      cryptoUtils.decryptValue.mockRejectedValue(decryptionError);

      await expect(getApiKey()).rejects.toThrow(
        "API key not found or could not be decrypted. Please reset it in settings."
      );
      expect(mockStorageGet).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(cryptoUtils.decryptValue).toHaveBeenCalledWith(MOCK_ENCRYPTED_KEY);
    });

    test("should throw error if chrome.storage.local.get fails", async () => {
      const storageError = new Error("Storage get error");
      mockStorageGet.mockRejectedValue(storageError);

      await expect(getApiKey()).rejects.toThrow(
        "API key not found or could not be decrypted. Please reset it in settings."
      );
      expect(mockStorageGet).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(cryptoUtils.decryptValue).not.toHaveBeenCalled();
    });
  });

  describe("setApiKey", () => {
    test("should encrypt and store the API key successfully", async () => {
      await setApiKey(TEST_API_KEY);

      expect(cryptoUtils.encryptValue).toHaveBeenCalledWith(TEST_API_KEY);
      expect(mockStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: MOCK_ENCRYPTED_KEY,
      });
    });

    test("should throw error if encryption fails", async () => {
      const encryptionError = new Error("Encryption failed");
      cryptoUtils.encryptValue.mockRejectedValue(encryptionError);

      await expect(setApiKey(TEST_API_KEY)).rejects.toThrow(
        "Error saving API key. Please try again."
      );
      expect(cryptoUtils.encryptValue).toHaveBeenCalledWith(TEST_API_KEY);
      expect(mockStorageSet).not.toHaveBeenCalled();
    });

    test("should throw error if chrome.storage.local.set fails", async () => {
      const storageError = new Error("Storage set error");
      mockStorageSet.mockRejectedValue(storageError);

      await expect(setApiKey(TEST_API_KEY)).rejects.toThrow(
        "Error saving API key. Please try again."
      );
      expect(cryptoUtils.encryptValue).toHaveBeenCalledWith(TEST_API_KEY);
      expect(mockStorageSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: MOCK_ENCRYPTED_KEY,
      });
    });
  });
});
