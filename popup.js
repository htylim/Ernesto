document.addEventListener("DOMContentLoaded", function () {
  const summarizeBtn = document.getElementById("summarize");
  const openOptionsBtn = document.getElementById("openOptions");
  const loadingDiv = document.getElementById("loading");
  const summaryDiv = document.getElementById("summary");

  summarizeBtn.addEventListener("click", async () => {
    try {
      // Get current tab URL using chrome.tabs API
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.url) {
        throw new Error("Could not get current page URL");
      }
      const url = tab.url;
      console.log("Current URL:", url);

      // Show loading state
      loadingDiv.style.display = "block";
      summaryDiv.style.display = "none";

      // Get API key from storage using correct key name
      const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
      console.log("Retrieved API Key:", openaiApiKey);

      if (!openaiApiKey) {
        throw new Error("API key not found. Please set it in settings.");
      }

      const requestBody = {
        model: "gpt-4o",
        temperature: 0,
        instructions:
          "Return response should be structured like this: \n\n'''\n<article title>\\n\\n\n<summary point 1>\\n\n<summary point 2>\\n\n... (as many summary points as there are in the summary)\n'''\n\nExample:\n\n'''\nEste es el titulo de un articulo\n\n- key point 1\n- key point 2\n- key point 3\n'''\n\nMake the response in the same language of the article. If the article is in spanish, use spanish, if its in english, use english.\nDo the summary exhaustive but written in a concise, brief way. Each key point should be a single sentence. If the sentence is too long then probably it should be 2 key points instead.\nDo not leave important points out, but do not include things that doesn't provide any information.",
        tools: [
          {
            type: "web_search",
            search_context_size: "high",
          },
        ],
        input: url,
        store: false,
      };

      console.log("Request body:", requestBody);

      // Make API request
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
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
        throw new Error(
          `API request failed: ${response.status} - ${errorText}`
        );
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

      summaryDiv.textContent = summary;
      summaryDiv.style.display = "block";
    } catch (error) {
      console.error("Summarization error:", error);
      summaryDiv.textContent = `Error: ${error.message}`;
      summaryDiv.style.display = "block";
    } finally {
      loadingDiv.style.display = "none";
    }
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
