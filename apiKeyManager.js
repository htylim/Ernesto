import { encryptValue, decryptValue } from "./cryptoUtils.js";

const STORAGE_KEY = "encryptedApiKey";

export async function getApiKey() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (!result[STORAGE_KEY]) {
      throw new Error("API key not found. Please set it in settings.");
    }
    return await decryptValue(result[STORAGE_KEY]);
  } catch (error) {
    console.error("Error getting API key:", error);
    throw new Error(
      "API key not found or could not be decrypted. Please reset it in settings."
    );
  }
}

export async function setApiKey(apiKey) {
  try {
    const encryptedKey = await encryptValue(apiKey);
    await chrome.storage.local.set({ [STORAGE_KEY]: encryptedKey });
  } catch (error) {
    console.error("Error saving API key:", error);
    throw new Error("Error saving API key. Please try again.");
  }
}
