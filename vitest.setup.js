// Jest setup file -> Vitest setup file

import crypto from "crypto"; // Import Node crypto
import { TextEncoder, TextDecoder } from "util";
import { vi } from "vitest"; // Import vi

// Mock chrome.runtime API
global.chrome = {
  runtime: {
    id: "test-extension-id",
  },
};

// Mock specific methods of Web Crypto API (crypto.subtle) using vi.stubGlobal
// This avoids overwriting the read-only global.crypto.subtle property

// Ensure global.crypto and global.crypto.subtle exist before stubbing
if (typeof global.crypto === "undefined") {
  // This shouldn't be needed in Node 22, but good practice
  global.crypto = {};
}
if (typeof global.crypto.subtle === "undefined") {
  // Provide a basic object if subtle is missing (unlikely in Node 22)
  global.crypto.subtle = {};
}

// Stub the individual subtle methods
vi.stubGlobal("crypto", {
  ...global.crypto, // Keep existing crypto properties (like getRandomValues)
  subtle: {
    ...global.crypto.subtle, // Keep existing subtle properties if any
    digest: vi.fn().mockImplementation(async (algorithm, data) => {
      const inputString = new TextDecoder().decode(data);
      console.log(`[Digest Mock] Input: '${inputString}'`); // Log the input
      const predictableHashString = `hashed_${inputString.substring(
        0,
        Math.min(inputString.length, 10)
      )}`;
      const buffer = new TextEncoder().encode(predictableHashString);
      console.log(`[Digest Mock] Output Hash: '${predictableHashString}'`); // Log the output
      return buffer.buffer;
    }),
    importKey: vi
      .fn()
      .mockImplementation(
        async (format, keyData, algorithm, extractable, keyUsages) => {
          // Simple mock: return keyData as Buffer
          return Buffer.from(keyData);
        }
      ),
    encrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
      const iv = Buffer.from(algorithm.iv);
      const keyBuffer = Buffer.from(key); // Assume key is already buffer-like
      const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return Buffer.concat([encrypted, authTag]).buffer;
    }),
    decrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
      const iv = Buffer.from(algorithm.iv);
      const keyBuffer = Buffer.from(key); // Assume key is already buffer-like
      const bufferData = Buffer.from(data);
      const authTagLength = 16; // Standard for AES-GCM
      if (bufferData.length < authTagLength) {
        throw new Error(
          "Invalid encrypted data: too short to contain auth tag."
        );
      }
      const encryptedData = bufferData.slice(
        0,
        bufferData.length - authTagLength
      );
      const authTag = bufferData.slice(bufferData.length - authTagLength);
      const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
      return decrypted.buffer;
    }),
  },
});

// Mock btoa and atob if not available
if (typeof btoa === "undefined") {
  global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
}
if (typeof atob === "undefined") {
  global.atob = (b64Encoded) =>
    Buffer.from(b64Encoded, "base64").toString("binary");
}

// Polyfill TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
