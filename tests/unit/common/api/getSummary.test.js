// Use Vitest globals
import { getSummary } from "../../../../src/common/api/getSummary.js";

// Mock the global fetch function
global.fetch = vi.fn();

describe("getSummary", () => {
  const apiKey = "test-api-key";
  const url = "http://example.com";
  const pageContent = JSON.stringify({
    title: "Test Title",
    url: url,
    content: "Paragraph 1. Paragraph 2.",
    contentType: "text",
  });
  const malformedPageContent = "this is not json";
  const expectedSummary =
    "<h1 id='article-title'>Test Title</h1><ul><li>Summary 1</li><li>Summary 2</li></ul>";

  beforeEach(() => {
    // Clear mock calls before each test
    fetch.mockClear();
    // Reset console mocks if necessary (optional)
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    console.error.mockRestore();
    console.log.mockRestore();
  });

  test("should return summary on successful API call", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output: [
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: expectedSummary,
              },
            ],
          },
        ],
      }),
      text: async () => "Success", // Added for completeness if needed by error path
    });

    const summary = await getSummary(url, apiKey, pageContent);
    expect(summary).toBe(expectedSummary);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: expect.stringContaining('"model":"gpt-4o-mini"'), // Check relevant parts
    });
  });

  test("should throw error if API key is missing", async () => {
    await expect(getSummary(url, null, pageContent)).rejects.toThrow(
      "API key not found. Please set it in settings."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("should handle malformed page content JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output: [
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: "<h1 id='article-title'>Article</h1><ul><li>Summary 1</li></ul>", // Adjusted expected summary
              },
            ],
          },
        ],
      }),
      text: async () => "Success",
    });

    const summary = await getSummary(url, apiKey, malformedPageContent);
    expect(summary).toBe(
      "<h1 id='article-title'>Article</h1><ul><li>Summary 1</li></ul>"
    ); // Ensure it still proceeds
    expect(console.error).toHaveBeenCalledWith(
      "Error parsing page content:",
      expect.any(Error)
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    // Check that the request body uses default title and the raw content
    const fetchCall = fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.input).toContain("Title: Article");
    expect(requestBody.input).toContain(malformedPageContent);
  });

  test("should throw error on API request failure", async () => {
    const errorText = "Internal Server Error";
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => errorText,
    });

    await expect(getSummary(url, apiKey, pageContent)).rejects.toThrow(
      `API request failed: 500 - ${errorText}`
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "API Error Response:",
      expect.objectContaining({
        status: 500,
        statusText: "Server Error",
        body: errorText,
      })
    );
  });

  test("should throw error if summary is not found in API response", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ output: [] }), // Empty output array
      text: async () => "Success",
    });

    await expect(getSummary(url, apiKey, pageContent)).rejects.toThrow(
      "Could not find summary in the API response"
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("should throw error if response structure is unexpected", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        // Missing 'output' or incorrect structure
        unexpected: "data",
      }),
      text: async () => "Success",
    });

    await expect(getSummary(url, apiKey, pageContent)).rejects.toThrow(
      "Could not find summary in the API response"
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
