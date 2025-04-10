/**
 * Module for getting AI responses for prompts
 */

/**
 * Get an AI response for the user's prompt
 * @param {string} prompt - The user's prompt
 * @param {string} url - The URL for context
 * @param {Array} promptHistory - Previous prompts and responses history
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - The AI response
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

  // For now, we'll mock a response
  // This will be replaced with actual API call later
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

  // Mock response - will be replaced with real API call
  const mockResponses = [
    "Based on the article, that's an interesting question! The key point is that...",
    "According to this content, there are several perspectives to consider...",
    "The article doesn't specifically address that, but based on the context...",
    "That's a great question about the content! From what I can see...",
  ];

  // Return random mock response
  const randomIndex = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[randomIndex];
}
