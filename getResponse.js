/**
 * Module for getting AI responses for prompts
 */

/**
 * Get an AI response for the user's prompt
 * @param {string} prompt - The user's prompt
 * @param {string} url - The URL for context
 * @param {string|null} previous_response_id - ID of the previous response for conversation continuity
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{assistantMessage: string, assistantMessageId: string}>} - The AI response and its ID
 */
export async function getResponse(
  prompt,
  url,
  previous_response_id = null,
  apiKey
) {
  if (!apiKey) {
    throw new Error(
      "API key is required. Please set your API key in the options."
    );
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt cannot be empty.");
  }

  try {
    // Prepare request body
    const requestBody = {
      model: "gpt-4o",
      instructions: `You are a helpful assistant provide always very concise and brief answers.`,
      tools: [{ type: "web_search", search_context_size: "high" }],
      input: `I'm reading this article ${url} and I want to ask you the following: ${prompt}`,
    };

    // If first prompt in the conversation add the `instructions`, if is not add the `previous_response_id`
    if (previous_response_id) {
      requestBody.previous_response_id = previous_response_id;
    }

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

    // Extract the assistant's message
    const assistantMessageObj = data.output?.find(
      (item) =>
        item.type === "message" &&
        item.status === "completed" &&
        item.role === "assistant"
    );

    // Extract the text and ID
    const assistantMessage = assistantMessageObj?.content?.find(
      (content) => content.type === "output_text" && content.text
    )?.text;

    const assistantMessageId = data.id || assistantMessageObj?.id;

    if (!assistantMessage) {
      throw new Error("Could not find assistant's message in the API response");
    }

    // Return the assistant message text and ID
    return {
      assistantMessage,
      assistantMessageId,
    };
  } catch (error) {
    console.error("Error getting prompt response:", error);
    throw error;
  }
}
