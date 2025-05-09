/**
 * Makes a request to the OpenAI API to convert text to speech
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - The OpenAI API key
 * @returns {Promise<Blob>} - The audio blob
 */
export async function getSpeechifyAudio(text, apiKey) {
  if (!apiKey) {
    throw new Error("API key not found. Please set it in settings.");
  }

  const instructions = `
    - Neutral tone: Keep it clear and objective, like a trusted news anchor.
    - Moderate pace: Not too fast, not too slow—ideal for easy comprehension.
    - Emphasis on key points: Slight inflections to highlight important details.
    - Conversational yet professional: Avoid overly dramatic or casual expressions.
    - Ignore URLs or Links: Do not read aloud links, this is an example of a link: ([huffingtonpost.es](https://www.huffingtonpost.es/global/trump-responde-china-aranceles-104-represalias-pekinbr.html?utm_source=openai)) when found something like that just ignore it.
    - When you read a bullet list make a pause before starting with each bullet. 
    - Spell out acronyms and numbers explicitly (e.g., "two million" instead of "2M")
  `;

  const requestBody = {
    model: "gpt-4o-mini-tts",
    input: text,
    voice: "echo",
    instructions: instructions,
  };

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return await response.blob();
}
