/**
 * Makes a request to the OpenAI API to summarize a webpage
 * @param {string} url - The URL of the webpage to summarize
 * @param {string} apiKey - The OpenAI API key
 * @returns {Promise<string>} - The summary text
 */
export async function getSummary(url, apiKey) {
  if (!apiKey) {
    throw new Error("API key not found. Please set it in settings.");
  }

  const requestBody = {
    model: "gpt-4o",
    temperature: 0,
    instructions: `
      Return response should be structured like this: 
      
      <h1>Article Title</h1>
      <ul>
      <li>Summary point 1</li>
      <li>Summary point 2</li>
      <li>Summary point 3</li>
      </ul>
      
      - Make the response in the same language of the article. If the article is in Spanish, use Spanish, if it's in English, use English.
      - Do the summary exhaustive but written in a concise, brief way. Each key point should be a single sentence. If the sentence is too long then probably it should be 2 key points instead.
      - Focus on main ideas, key events, important people, and impactful statistics.
      - Ensure sentences are short and clear for better speech quality.
      - Avoid complex punctuation; prefer commas and periods
      `,
    tools: [
      {
        type: "web_search",
        search_context_size: "high",
      },
    ],
    input: `Summarize this article: ${url}`,
    store: false,
  };

  console.log("Request body:", requestBody);

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
