# Ernesto - Chrome Extension

**Ernesto** is a simple and powerful Chrome extension designed to help you consume news articles faster and more comfortably. this tool brings smart summarization and audio playback to your browsing experience.

## 🚀 Features

- **Article Summarization**

  - One-click article summarization
  - Right-click any article link to summarize without opening
  - Clean popup display of summaries
  - Summarization is done using OpenAI's Responses API (asking the API plainly "summarize this article")

- **Text-to-Speech**

  - Listen to summaries with built-in audio player
  - Basic playback controls (play/pause/stop)
  - TTS is done using OpenAI's Audio Speech API.

- **Simple Interface**

  - Browser toolbar button
  - Context menu integration
  - Easy-to-use popup controls

- **Configuration**
  - OpenAI's KEY for both APIs is the only required configuration. User will have to generate and provide their own keys for the extension to work.

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
├── popup.html/js        # Extension popup UI and logic
├── options.html/js      # Settings page UI and logic
├── icons/              # Extension icons
├── *.test.js           # Test files for components
└── jest.setup.js       # Jest testing configuration
```

## 📦 Installation (Development Mode)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. You should now see the Ernesto icon in your toolbar.

## 📝 Usage Tips

- Use the **right-click context menu** for fast access without opening articles.
- Combine both summarization and audio features to skim news hands-free.

## 📅 Roadmap (Ideas for Future Versions)

- Save summaries for later reading/listening.
- Customize TTS voice (maybe use the actual voice from Ernesto Tenembaum) and speed.
- Multilingual support.
- Keyboard shortcuts for faster activation.
