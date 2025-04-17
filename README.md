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

- **Configuration**
  - OpenAI's KEY for both APIs is the only required configuration. User will have to generate and provide their own keys for the extension to work.
  - API keys are securely stored with encryption
  - Customizable color themes, settable globally (default) or per-domain.

## 🛠️ Tech Stack

- **JavaScript / HTML / CSS**: Core technologies for the extension frontend.
- **Chrome Extension APIs**: For interaction with the browser's context menus, tabs, popups, and media playback.
- **External APIs**:
  - **Summarization API**: OpenAI's responses API. To extracts the key points from a given article.
  - **TTS API**: OpenAI's Audio Speech API. To converts the summary text into an audio file.

## 📁 Directory Structure

```
Ernesto/
├── manifest.json         # Extension configuration
├── background.js         # Background service worker
├── sidepanel.html/js     # Side panel UI and logic
├── options.html/js       # Settings page UI and logic
├── getSummary.js         # Article summarization logic
├── getSpeechifyAudio.js  # Text-to-speech conversion
├── genericCache.js       # Base caching functionality
├── summariesCache.js     # Summaries caching implementation
├── speechifyCache.js     # Audio caching implementation
├── cryptoUtils.js        # Encryption utilities
├── icons/               # Extension icons
├── *.test.js            # Test files for components
├── jest.setup.js        # Jest testing configuration
├── package.json         # Project dependencies
└── node_modules/        # Installed dependencies
```

## 📦 Installation (Development Mode)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. You should now see the Ernesto icon in your toolbar.

## 🛠️ Debugging tips

- Activate the extension and right-click on it to select "Inspect"

- On the dev tools we can access the console log but also if we go to "Application" and to "Extension Storage" we can inspect our `chrome.storage.local` usage.

- `chrome.storage.local` has a storage limit of 5MB per item. Any audio bigger than that won't fit (MP3 TTS are usually ~1MB so we should be ok but be advised)

## 📝 Usage Tips

- Click the extension icon to open the side panel for the current tab.

- Click the Gear icon to open Options, enter your OpenAI API key (get it from [OpenAI Platform](https://platform.openai.com/api-keys) and add billing info), and save to start using the extension.

- Each tab maintains its own state, so you can summarize multiple articles in parallel.

- When you switch tabs, the side panel will update to show the summary for the current tab.

- You can click Speechify to in one click get both summary and TTS (Speechify will automatically trigger the summarize for you)

- Click on the Gear icon to set up the API key but as well to manage the summaries and audio caches.

- Note that caches will automatically purge anything older than 24hrs so the extension shouldnt grow in size considerably.

## 📅 Roadmap (Ideas for Future Versions)

- Customize TTS voice (maybe use the actual voice from Ernesto Tenembaum) and speed.

- Keyboard shortcuts for faster activation.

## Pending Tasks (to implement)

- add unit testing for key components and logic
- add Google Gemini support and have the choose of model to be configurable from the options page.
- add encryption for API key storage
- implement rate limiting for external APIs
- implement quota management to prevent storage limits issues in chrome.storage.local
- log errors to a service rather than console for production
