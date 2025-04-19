import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractArticleContent } from "../../../src/core/contentExtractor";

describe("contentExtractor", () => {
  const mockMetadata = {
    title: "Test Article",
    url: "https://example.com",
    siteName: "Example Site",
  };

  const mockHtml = `
    <html>
      <head>
        <title>Test Article</title>
      </head>
      <body>
        <article>
          <h1>Test Article</h1>
          <p>This is a test article content.</p>
        </article>
      </body>
    </html>
  `;

  beforeEach(() => {
    // Mock Readability constructor and instance
    const mockArticle = {
      title: "Test Article",
      content: "<div>This is a test article content.</div>",
      excerpt: "Test excerpt",
      siteName: "Example Site",
    };

    global.Readability = vi.fn().mockImplementation(() => ({
      parse: () => mockArticle,
    }));

    global.DOMPurify = {
      sanitize: vi.fn().mockImplementation((html) => html),
    };
  });

  it("should extract article content successfully", async () => {
    const result = await extractArticleContent(mockHtml, mockMetadata);

    expect(result).toEqual({
      title: "Test Article",
      url: "https://example.com",
      siteName: "Example Site",
      excerpt: "Test excerpt",
      content: "<div>This is a test article content.</div>",
      contentType: "html",
    });
  });

  it("should handle Readability failure and use fallback", async () => {
    global.Readability = vi.fn().mockImplementation(() => ({
      parse: () => {
        throw new Error("Readability failed");
      },
    }));

    const result = await extractArticleContent(mockHtml, mockMetadata);

    expect(result).toEqual({
      title: "Test Article",
      url: "https://example.com",
      siteName: "Example Site",
      content: expect.any(String),
      contentType: "text",
    });
  });

  it("should handle missing libraries", async () => {
    global.Readability = undefined;
    global.DOMPurify = undefined;

    const result = await extractArticleContent(mockHtml, mockMetadata);

    expect(result).toEqual({
      title: "Test Article",
      url: "https://example.com",
      siteName: "Example Site",
      content: expect.any(String),
      contentType: "text",
    });
  });
});
