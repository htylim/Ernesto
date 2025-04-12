/**
 * Module for getting AI responses for prompts
 */

/**
 * Get an AI response for the user's prompt
 * @param {string} prompt - The user's prompt
 * @param {string} url - The URL for context
 * @param {Array} promptHistory - Previous prompts and responses history
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{assistantMessage: string, output: Array}>} - The AI response and full output
 */
export async function getPromptResponse(
  prompt,
  url,
  promptHistory = [],
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
    // Prepare input for the API based on conversation history
    let input = [];

    // If we have previous conversation history, add it to the input
    if (promptHistory && promptHistory.length > 0) {
      input = [...promptHistory];
    }

    // Add the new user prompt
    input.push({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: prompt,
        },
      ],
    });

    // Prepare request body
    const requestBody = {
      model: "gpt-4o",
      temperature: 0.7,
      instructions: `You are an assistant helping understand this article ${url}.`,
      tools: [{ type: "web_search", search_context_size: "high" }],
      input: input,
      store: false,
    };

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

    // Extract the assistant's message text
    const assistantMessage = data.output
      ?.find(
        (item) =>
          item.type === "message" &&
          item.status === "completed" &&
          item.role === "assistant"
      )
      ?.content?.find(
        (content) => content.type === "output_text" && content.text
      )?.text;

    if (!assistantMessage) {
      throw new Error("Could not find assistant's message in the API response");
    }

    // Return the assistant message text and full output
    return {
      assistantMessage,
      output: data.output,
    };
  } catch (error) {
    console.error("Error getting prompt response:", error);
    throw error;
  }
}
