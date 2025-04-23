# Ernesto - Chrome Extension

**Ernesto** is a simple and powerful Chrome extension designed to help you consume news articles faster and more comfortably. this tool brings smart summarization and audio playback to your browsing experience.

## 🚀 Features

- **Article Summarization**

  - One-click article summarization
  - Clean side panel display of summaries
  - Summarization is done using OpenAI's Responses API (asking the API plainly "summarize this article")
  - Works with paywalled and bot-protected content by using your authenticated browser view

- **Article Question-Answering**

  - Ask questions about the article content
  - Get AI-powered answers based on the article text
  - Interactive Q&A interface in the side panel

- **Text-to-Speech**

  - Listen to summaries with built-in audio player
  - Basic playback controls (play/pause/stop)
  - TTS is done using OpenAI's Audio Speech API.

- **Simple Interface**

  - Browser toolbar button opens a persistent side panel
  - Tab-specific summarization and playback
  - Remembers state when switching between tabs
  - Supports color themes customized per URL that is summarizing

- **Configuration**
  - OpenAI's KEY for both APIs is the only required configuration. User will have to generate and provide their own keys for the extension to work.
  - API keys are securely stored with encryption
  - Customizable color themes, settable globally (default) or per-domain.

## 📦 Installation (Development Mode)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. You should now see the Ernesto icon in your toolbar.

## 🛠️ Pending

- when there is a summarize request in progress and we get the response don't load it if the active URL is not anymore the one from the summar.y
- Audio caching is disabled. Need to find a better solution
- Improve Options page UIUX. Is awful
- Find a way to automatically detect a page's accent color and use that to colorize the sidepanel (instead of today manual option)
- Provide button and action for different "summaries strategies" (ie we could have a very short summary, a longer summary, a per paragraph summary (current), etc..)
