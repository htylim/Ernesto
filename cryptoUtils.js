/**
 * Utility functions for encrypting and decrypting sensitive data like API keys
 * Uses Chrome's crypto API with AES-GCM encryption
 */

// Generate a strong encryption key based on Chrome's extension ID
// This provides a unique per-extension encryption key
async function generateEncryptionKey() {
  // Get extension ID
  const extensionId = chrome.runtime.id;

  // Create a key derivation from the extension ID
  const encoder = new TextEncoder();
  const data = encoder.encode(extensionId);
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Import the derived key for AES-GCM encryption
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string value
 * @param {string} value - The value to encrypt
 * @returns {Promise<string>} - Base64 encoded encrypted data
 */
export async function encryptValue(value) {
  if (!value) return "";

  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(value);

    // Generate a random initialization vector (IV)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);

    // Convert to Base64 for storage
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts an encrypted string value
 * @param {string} encryptedValue - Base64 encoded encrypted data
 * @returns {Promise<string>} - Decrypted value
 */
export async function decryptValue(encryptedValue) {
  if (!encryptedValue) return "";

  try {
    const key = await generateEncryptionKey();

    // Convert from Base64
    const encryptedBytes = Uint8Array.from(atob(encryptedValue), (c) =>
      c.charCodeAt(0)
    );

    // Extract IV (first 12 bytes)
    const iv = encryptedBytes.slice(0, 12);
    const data = encryptedBytes.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}
