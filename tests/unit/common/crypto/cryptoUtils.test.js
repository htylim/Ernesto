/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals";
import { encryptValue, decryptValue } from "@/common/crypto/cryptoUtils.js";

// Mock global objects required by cryptoUtils
global.chrome = {
  runtime: {
    id: "test-extension-id",
  },
};

// Mock crypto APIs
const mockKeyData = new ArrayBuffer(32); // Mock raw key data (SHA-256 hash)
const mockCryptoKey = {
  type: "secret",
  algorithm: { name: "AES-GCM" },
  usages: ["encrypt", "decrypt"],
}; // Mock CryptoKey object
const mockIv = new Uint8Array(12).fill(1); // Deterministic IV for testing
const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5]).buffer; // Mock encrypted data

global.crypto = {
  subtle: {
    digest: jest.fn().mockResolvedValue(mockKeyData),
    importKey: jest.fn().mockResolvedValue(mockCryptoKey),
    encrypt: jest.fn().mockResolvedValue(mockEncryptedData),
    // Mock decrypt to return the original data for simplicity in this example
    // In a real scenario, you might want more sophisticated mock decryption
    decrypt: jest.fn().mockImplementation(async (algo, key, data) => {
      // This mock assumes the 'data' passed to decrypt is the original plaintext
      // which isn't realistic but simplifies testing the flow.
      // A better mock would reverse the mock encryption process.
      // For now, let's return a fixed known ArrayBuffer.
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      // Find the original plaintext corresponding to mockEncryptedData for consistency
      // Based on how encryptValue works, it combines IV + encrypted.
      // Decrypt gets the part after IV. So this mock needs to know what plaintext
      // would result in `mockEncryptedData` after encryption with `mockCryptoKey` and `mockIv`.
      // Let's assume the plaintext "test data" was encrypted.
      return encoder.encode("test data").buffer;
    }),
  },
  getRandomValues: jest.fn().mockReturnValue(mockIv),
};

// Mock browser built-ins used
global.TextEncoder = class TextEncoder {
  encode(str) {
    // Simple polyfill sufficient for testing
    const utf8 = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }
};

global.TextDecoder = class TextDecoder {
  decode(buffer) {
    // Simple polyfill sufficient for testing
    const arr = new Uint8Array(buffer);
    const utf8 = String.fromCharCode(...arr);
    try {
      return decodeURIComponent(escape(utf8));
    } catch (e) {
      // Handle cases where the byte sequence is not valid UTF-8
      console.warn("TextDecoder encountered invalid UTF-8 sequence.", e);
      return utf8; // Fallback to potentially incorrect string
    }
  }
};

global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
global.atob = (b64) => Buffer.from(b64, "base64").toString("binary");

describe("cryptoUtils", () => {
  const testString = "test data";
  let expectedBase64Encrypted;

  beforeAll(() => {
    // Calculate the expected base64 string based on mock IV and mock encrypted data
    const combined = new Uint8Array(
      mockIv.length + mockEncryptedData.byteLength
    );
    combined.set(mockIv);
    combined.set(new Uint8Array(mockEncryptedData), mockIv.length);
    expectedBase64Encrypted = global.btoa(String.fromCharCode(...combined));
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Re-assign mock implementations since clearAllMocks removes them
    global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockKeyData);
    global.crypto.subtle.importKey = jest.fn().mockResolvedValue(mockCryptoKey);
    global.crypto.subtle.encrypt = jest
      .fn()
      .mockResolvedValue(mockEncryptedData);
    // Adjust mock decrypt to return the *correct* original data based on our testString
    const encoder = new TextEncoder();
    global.crypto.subtle.decrypt = jest
      .fn()
      .mockResolvedValue(encoder.encode(testString).buffer);
    global.crypto.getRandomValues = jest.fn().mockReturnValue(mockIv);
  });

  test("encryptValue should encrypt a string", async () => {
    const encrypted = await encryptValue(testString);

    expect(encrypted).toBe(expectedBase64Encrypted);
    expect(crypto.subtle.digest).toHaveBeenCalledWith(
      "SHA-256",
      expect.any(Uint8Array)
    );
    expect(crypto.subtle.importKey).toHaveBeenCalledWith(
      "raw",
      mockKeyData,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    expect(crypto.getRandomValues).toHaveBeenCalledWith(new Uint8Array(12));
    expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
      { name: "AES-GCM", iv: mockIv },
      mockCryptoKey,
      expect.any(Uint8Array) // Check the encoded data if necessary
    );
    // Check that the input to encrypt matches the test string
    const encodedTestString = new TextEncoder().encode(testString);
    expect(crypto.subtle.encrypt.mock.calls[0][2]).toEqual(encodedTestString);
  });

  test("decryptValue should decrypt a string", async () => {
    const decrypted = await decryptValue(expectedBase64Encrypted);

    expect(decrypted).toBe(testString);
    expect(crypto.subtle.digest).toHaveBeenCalledWith(
      "SHA-256",
      expect.any(Uint8Array)
    );
    expect(crypto.subtle.importKey).toHaveBeenCalledWith(
      "raw",
      mockKeyData,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    expect(crypto.subtle.decrypt).toHaveBeenCalledWith(
      { name: "AES-GCM", iv: mockIv },
      mockCryptoKey,
      expect.objectContaining({ buffer: mockEncryptedData }) // Compare the underlying buffer
    );
  });

  test("encryptValue should return empty string for empty input", async () => {
    expect(await encryptValue("")).toBe("");
    expect(crypto.subtle.encrypt).not.toHaveBeenCalled();
  });

  test("decryptValue should return empty string for empty input", async () => {
    expect(await decryptValue("")).toBe("");
    expect(crypto.subtle.decrypt).not.toHaveBeenCalled();
  });

  test("encryptValue should handle errors", async () => {
    crypto.subtle.encrypt.mockRejectedValue(new Error("Encryption failed"));
    await expect(encryptValue(testString)).rejects.toThrow(
      "Failed to encrypt data"
    );
  });

  test("decryptValue should handle errors", async () => {
    crypto.subtle.decrypt.mockRejectedValue(new Error("Decryption failed"));
    await expect(decryptValue(expectedBase64Encrypted)).rejects.toThrow(
      "Failed to decrypt data"
    );
  });

  test("decryptValue should handle invalid base64 input", async () => {
    // Provide input that cannot be correctly base64 decoded or doesn't match IV + data structure
    const invalidBase64 = "this is not valid base64%%%";
    global.atob = jest.fn().mockImplementation(() => {
      throw new Error("Invalid character");
    }); // Mock atob to throw
    await expect(decryptValue(invalidBase64)).rejects.toThrow(
      "Failed to decrypt data"
    );
    // Restore atob if needed for other tests, or ensure it's reset in beforeEach/afterEach
    global.atob = (b64) => Buffer.from(b64, "base64").toString("binary"); // Restore original mock
  });
});
