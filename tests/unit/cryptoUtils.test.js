import {
  encryptValue,
  decryptValue,
} from "../../src/common/crypto/cryptoUtils.js";

describe("cryptoUtils", () => {
  // Add tests here

  it("should encrypt and decrypt a value successfully", async () => {
    const originalValue = "mySecretApiKey123";
    const encryptedValue = await encryptValue(originalValue);

    // Check if the encrypted value is a non-empty string (Base64)
    expect(encryptedValue).toBeDefined();
    expect(typeof encryptedValue).toBe("string");
    expect(encryptedValue.length).toBeGreaterThan(0);
    // Ensure it doesn't encrypt to the original value
    expect(encryptedValue).not.toBe(originalValue);

    const decryptedValue = await decryptValue(encryptedValue);
    expect(decryptedValue).toBe(originalValue);
  });

  it("should return empty string if encrypting an empty string", async () => {
    expect(await encryptValue("")).toBe("");
  });

  it("should return empty string if decrypting an empty string", async () => {
    expect(await decryptValue("")).toBe("");
  });

  it("should handle encryption/decryption of values with special characters", async () => {
    const originalValue = "!@#$%^&*()_+=-`~[]{};\\':\",./<>?";
    const encryptedValue = await encryptValue(originalValue);
    const decryptedValue = await decryptValue(encryptedValue);
    expect(decryptedValue).toBe(originalValue);
  });

  // Note: Error cases (like invalid encrypted string for decryption) are harder
  // to test reliably without more specific mocks or knowledge of expected
  // error types from the underlying crypto implementation differences.
});
