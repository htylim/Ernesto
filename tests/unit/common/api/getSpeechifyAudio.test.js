// Use Vitest globals
import { getSpeechifyAudio } from "../../../../src/common/api/getSpeechifyAudio.js";

// Mock the global fetch function using vi.fn()
global.fetch = vi.fn();
// Mock Blob for Node environment if needed (Vitest runs in Node)
if (typeof Blob === "undefined") {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
      this.size = parts.reduce((acc, part) => acc + part.length, 0);
      this.type = options?.type || "";
    }
    // Add other methods if your code uses them, e.g., text(), arrayBuffer()
    async text() {
      return this.parts.join("");
    }
    // Minimal mock for arrayBuffer if needed by any internal checks
    async arrayBuffer() {
      const buffer = new ArrayBuffer(this.size);
      const view = new Uint8Array(buffer);
      let offset = 0;
      for (const part of this.parts) {
        // Assuming parts are strings for simplicity here
        const partBuffer = new TextEncoder().encode(part);
        view.set(partBuffer, offset);
        offset += partBuffer.length;
      }
      return buffer;
    }
  };
}

describe("getSpeechifyAudio", () => {
  const apiKey = "test-api-key";
  const text = "Convert this text to speech.";
  const mockBlob = new Blob(["mock audio data"], { type: "audio/mpeg" });

  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks(); // Use vi
    // Use vi.spyOn
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should return audio blob on successful API call", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob, // Mock the blob() method
      text: async () => "Success", // For error path if needed
    });

    const result = await getSpeechifyAudio(text, apiKey);
    // Check if it's an instance of the potentially polyfilled Blob
    expect(result).toBeInstanceOf(global.Blob);
    expect(result.size).toBe(mockBlob.size);
    expect(result.type).toBe(mockBlob.type);
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = fetch.mock.calls[0];
    expect(fetchCall[0]).toBe("https://api.openai.com/v1/audio/speech");
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.model).toBe("gpt-4o-mini-tts");
    expect(requestBody.input).toBe(text);
    expect(requestBody.voice).toBe("echo");
    expect(requestBody.instructions).toBeDefined();
  });

  test("should throw error if API key is missing", async () => {
    await expect(getSpeechifyAudio(text, null)).rejects.toThrow(
      "API key not found. Please set it in settings."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("should throw error on API request failure", async () => {
    const errorText = "Service Unavailable";
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Error",
      text: async () => errorText, // API returns text on error
      blob: async () => null, // Should not be called
    });

    await expect(getSpeechifyAudio(text, apiKey)).rejects.toThrow(
      `API request failed: 503 - ${errorText}`
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    // Optionally check console.error if the function logged errors
    // expect(console.error).toHaveBeenCalledWith(...);
  });
});
