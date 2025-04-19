// import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals"; // REMOVED
// Use Vitest globals
import { getResponse } from "../../../../src/common/api/getResponse.js";

// Mock the global fetch function using vi.fn()
global.fetch = vi.fn();

describe("getResponse", () => {
  const apiKey = "test-api-key";
  const url = "http://example.com";
  const prompt = "What is this page about?";
  const previousResponseId = "resp_123";
  const expectedAssistantMessage = "This page is about testing.";
  const expectedAssistantMessageId = "resp_456";

  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks(); // Use vi
    // Use vi.spyOn
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("should return response on successful API call (first prompt)", async () => {
    // fetch mock setup remains the same, just uses vi.fn()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: expectedAssistantMessageId,
        output: [
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: expectedAssistantMessage,
              },
            ],
          },
        ],
      }),
      text: async () => "Success",
    });

    const result = await getResponse(prompt, url, null, apiKey);
    expect(result).toEqual({
      assistantMessage: expectedAssistantMessage,
      assistantMessageId: expectedAssistantMessageId,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.model).toBe("gpt-4o");
    expect(requestBody.input).toContain(prompt);
    expect(requestBody.input).toContain(url);
    expect(requestBody.previous_response_id).toBeUndefined(); // No previous ID for first prompt
    expect(console.error).not.toHaveBeenCalled(); // Example of using spy
  });

  test("should return response on successful API call (subsequent prompt)", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: expectedAssistantMessageId,
        output: [
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: expectedAssistantMessage,
              },
            ],
          },
        ],
      }),
      text: async () => "Success",
    });

    const result = await getResponse(prompt, url, previousResponseId, apiKey);
    expect(result).toEqual({
      assistantMessage: expectedAssistantMessage,
      assistantMessageId: expectedAssistantMessageId,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.previous_response_id).toBe(previousResponseId); // Should include previous ID
  });

  test("should throw error if API key is missing", async () => {
    await expect(getResponse(prompt, url, null, null)).rejects.toThrow(
      "API key is required."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("should throw error if prompt is empty", async () => {
    await expect(getResponse("", url, null, apiKey)).rejects.toThrow(
      "Prompt cannot be empty."
    );
    await expect(getResponse(" ", url, null, apiKey)).rejects.toThrow(
      "Prompt cannot be empty."
    );
    await expect(getResponse(null, url, null, apiKey)).rejects.toThrow(
      "Prompt cannot be empty."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("should throw error on API request failure", async () => {
    const errorText = "Unauthorized";
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Auth Error",
      text: async () => errorText,
    });

    await expect(getResponse(prompt, url, null, apiKey)).rejects.toThrow(
      `API request failed: 401 - ${errorText}`
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    // Use the spy variable directly
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "API Error Response:",
      expect.objectContaining({
        status: 401,
        statusText: "Auth Error",
        body: errorText,
      })
    );
  });

  test("should throw error if assistant message is not found", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: expectedAssistantMessageId,
        output: [], // Empty output
      }),
      text: async () => "Success",
    });

    await expect(getResponse(prompt, url, null, apiKey)).rejects.toThrow(
      "Could not find assistant's message in the API response"
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("should use assistant message ID if top-level ID is missing", async () => {
    const assistantObjId = "msg_789";
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        // No top-level id
        output: [
          {
            id: assistantObjId, // ID is here
            type: "message",
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: expectedAssistantMessage,
              },
            ],
          },
        ],
      }),
      text: async () => "Success",
    });

    const result = await getResponse(prompt, url, null, apiKey);
    expect(result).toEqual({
      assistantMessage: expectedAssistantMessage,
      assistantMessageId: assistantObjId, // Should use the message object ID
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
