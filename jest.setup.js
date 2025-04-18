// Jest setup file

import crypto from "crypto";
import { TextEncoder, TextDecoder } from "util";

// Mock chrome.runtime API
global.chrome = {
  runtime: {
    id: "test-extension-id",
  },
};

// Mock Web Crypto API (crypto.subtle) using Node.js crypto
const subtleCryptoMock = {
  async digest(algorithm, data) {
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(data));
    return hash.digest().buffer;
  },

  async importKey(format, keyData, algorithm, extractable, keyUsages) {
    return Buffer.from(keyData);
  },

  async encrypt(algorithm, key, data) {
    const iv = Buffer.from(algorithm.iv);
    const keyBuffer = Buffer.from(key);
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([encrypted, authTag]).buffer;
  },

  async decrypt(algorithm, key, data) {
    const iv = Buffer.from(algorithm.iv);
    const keyBuffer = Buffer.from(key);
    const bufferData = Buffer.from(data);
    const authTagLength = 16;
    if (bufferData.length < authTagLength) {
      throw new Error("Invalid encrypted data: too short to contain auth tag.");
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
  },
};

// Mock crypto.getRandomValues and crypto.subtle
if (typeof global.crypto === "undefined") {
  global.crypto = {};
}
global.crypto.subtle = subtleCryptoMock;
global.crypto.getRandomValues = (typedArray) => {
  const buffer = crypto.randomBytes(typedArray.byteLength);
  typedArray.set(
    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length)
  );
  return typedArray;
};

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
