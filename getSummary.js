/**
 * Makes a request to the OpenAI API to summarize a webpage
 * @param {string} url - The URL of the webpage to summarize
 * @param {string} apiKey - The OpenAI API key
 * @param {string} pageContent - The extracted content of the webpage
 * @returns {Promise<string>} - The summary text
 */
export async function getSummary(url, apiKey, pageContent) {
  if (!apiKey) {
    throw new Error("API key not found. Please set it in settings.");
  }

  let pageData;
  try {
    pageData = JSON.parse(pageContent);
  } catch (error) {
    console.error("Error parsing page content:", error);
    pageData = {
      content: pageContent,
      title: "Article",
      url,
      contentType: "text",
    };
  }

  const requestBody = {
    model: "gpt-4o-mini",
    temperature: 0,
    input: `
      Summarize this article following the instructions below.

      Title: ${pageData.title}
      URL: ${pageData.url}
      ${pageData.excerpt ? `Excerpt: ${pageData.excerpt}` : ""}
      Content Format: ${pageData.contentType || "text"}
      Content: 
      --8<----8<--- content starts here ---8<----8<
      ${pageData.content}
      --8<----8<--- content stopped here ---8<----8<

      Instructions:
      Return response should be structured like this: 
      
      <h1 id='article-title'>Article Title</h1>
      <ul>
      <li>Summary point 1</li>
      <li>Summary point 2</li>
      <li>Summary point 3</li>
      </ul>
      
      - Make the response in the same language of the article. If the article is in Spanish, use Spanish, if it's in English, use English.
      - For doing the summary create a bullet PER PARAGRAPH of the article. If the article has 10 paragraph, create 10 bullets. Each bullet should be the summary of that paragraph. Make each paragraph summary precise and concise to capture the main points of that paragraph.
      - Focus on main ideas, key events, important people, and impactful statistics.
      - Ensure sentences are short and clear for better speech quality.
      - Avoid complex punctuation; prefer commas and periods
      - Note that the supplied page contentmay include more than just the article we want summarized. If that's the case ignore anything but the article.
      `,
    store: false,
  };

  console.log(
    "Request body:",
    JSON.stringify(requestBody).substring(0, 200) + "..."
  );

  // Make API request
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error Response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("API Success Response:", data);

  // Parse the response according to the correct structure
  const summary = data.output
    ?.find(
      (item) =>
        item.type === "message" &&
        item.status === "completed" &&
        item.role === "assistant"
    )
    ?.content?.find(
      (content) => content.type === "output_text" && content.text
    )?.text;

  if (!summary) {
    throw new Error("Could not find summary in the API response");
  }

  return summary;
}
