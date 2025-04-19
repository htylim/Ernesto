/**
 * @jest-environment jsdom
 */
// Use Vitest globals
import {
  encryptValue,
  decryptValue,
} from "../../../../src/common/crypto/cryptoUtils.js";

// Mock global objects required by cryptoUtils
global.chrome = {
  runtime: {
    id: "test-extension-id",
  },
};

// Mock crypto APIs using vi.fn()
const mockKeyData = new ArrayBuffer(32); // Mock raw key data (SHA-256 hash)
const mockCryptoKey = {
  type: "secret",
  algorithm: { name: "AES-GCM" },
  usages: ["encrypt", "decrypt"],
}; // Mock CryptoKey object
const mockIv = new Uint8Array(12).fill(1); // Deterministic IV for testing
const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5]).buffer; // Mock encrypted data

// Note: The setup file (vitest.setup.js) already stubs global.crypto.subtle methods.
// We rely on those mocks being reset by vi.clearAllMocks() in beforeEach.
// We only need to mock getRandomValues here if we need deterministic IVs for tests.
if (typeof global.crypto === "undefined") global.crypto = {}; // Ensure crypto exists
global.crypto.getRandomValues = vi.fn().mockReturnValue(mockIv);

// Mock browser built-ins used (Keep for now, maybe simplify later)
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
    vi.clearAllMocks();
    // Re-assign getRandomValues mock for deterministic IV per test
    global.crypto.getRandomValues = vi.fn().mockReturnValue(mockIv);

    // Restore default mock implementations for subtle methods from setup if needed
    // This might be necessary if a previous test used mockRejectedValue
    const subtleDigestMock = vi.mocked(global.crypto.subtle.digest);
    const subtleImportKeyMock = vi.mocked(global.crypto.subtle.importKey);
    const subtleEncryptMock = vi.mocked(global.crypto.subtle.encrypt);
    const subtleDecryptMock = vi.mocked(global.crypto.subtle.decrypt);

    subtleDigestMock.mockResolvedValue(mockKeyData);
    subtleImportKeyMock.mockResolvedValue(mockCryptoKey);
    subtleEncryptMock.mockResolvedValue(mockEncryptedData);
    subtleDecryptMock.mockResolvedValue(
      new TextEncoder().encode(testString).buffer
    );
  });

  test("encryptValue should encrypt a string", async () => {
    const subtleEncryptMock = vi.mocked(global.crypto.subtle.encrypt);
    const subtleDigestMock = vi.mocked(global.crypto.subtle.digest);
    const subtleImportKeyMock = vi.mocked(global.crypto.subtle.importKey);

    const encrypted = await encryptValue(testString);

    expect(encrypted).toBe(expectedBase64Encrypted);
    expect(subtleDigestMock).toHaveBeenCalledWith(
      "SHA-256",
      expect.any(Uint8Array)
    );
    expect(subtleImportKeyMock).toHaveBeenCalledWith(
      "raw",
      mockKeyData,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    expect(global.crypto.getRandomValues).toHaveBeenCalledWith(
      new Uint8Array(12)
    );
    expect(subtleEncryptMock).toHaveBeenCalledWith(
      { name: "AES-GCM", iv: mockIv },
      mockCryptoKey,
      expect.any(Uint8Array) // Check the encoded data if necessary
    );
    const encodedTestString = new TextEncoder().encode(testString);
    expect(subtleEncryptMock.mock.calls[0][2]).toEqual(encodedTestString);
  });

  test("decryptValue should decrypt a string", async () => {
    const subtleDecryptMock = vi.mocked(global.crypto.subtle.decrypt);
    const subtleDigestMock = vi.mocked(global.crypto.subtle.digest);
    const subtleImportKeyMock = vi.mocked(global.crypto.subtle.importKey);

    const decrypted = await decryptValue(expectedBase64Encrypted);

    expect(decrypted).toBe(testString);
    expect(subtleDigestMock).toHaveBeenCalledWith(
      "SHA-256",
      expect.any(Uint8Array)
    );
    expect(subtleImportKeyMock).toHaveBeenCalledWith(
      "raw",
      mockKeyData,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    expect(subtleDecryptMock).toHaveBeenCalledWith(
      { name: "AES-GCM", iv: mockIv },
      mockCryptoKey,
      expect.objectContaining({ buffer: mockEncryptedData })
    );
  });

  test("encryptValue should return empty string for empty input", async () => {
    expect(await encryptValue("")).toBe("");
    expect(vi.mocked(global.crypto.subtle.encrypt)).not.toHaveBeenCalled();
  });

  test("decryptValue should return empty string for empty input", async () => {
    expect(await decryptValue("")).toBe("");
    expect(vi.mocked(global.crypto.subtle.decrypt)).not.toHaveBeenCalled();
  });

  test("encryptValue should handle errors", async () => {
    vi.mocked(global.crypto.subtle.encrypt).mockRejectedValue(
      new Error("Encryption failed")
    );
    await expect(encryptValue(testString)).rejects.toThrow(
      "Failed to encrypt data"
    );
  });

  test("decryptValue should handle errors", async () => {
    vi.mocked(global.crypto.subtle.decrypt).mockRejectedValue(
      new Error("Decryption failed")
    );
    await expect(decryptValue(expectedBase64Encrypted)).rejects.toThrow(
      "Failed to decrypt data"
    );
  });

  test("decryptValue should handle invalid base64 input", async () => {
    const invalidBase64 = "this is not valid base64%%%";
    const originalAtob = global.atob;
    global.atob = vi.fn().mockImplementation(() => {
      // Use vi.fn
      throw new Error("Invalid character");
    });
    await expect(decryptValue(invalidBase64)).rejects.toThrow(
      "Failed to decrypt data"
    );
    global.atob = originalAtob; // Restore original mock
  });
});
