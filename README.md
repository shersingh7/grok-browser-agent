# Grok Browser Agent

A Chrome extension that brings Grok AI directly into your browser via a side panel.

## Features

- 🤖 **Side Panel Integration** - Grok AI in a persistent side panel
- 🌐 **Page Context** - Send current page content to Grok for analysis
- 📺 **YouTube Summarization** - Quick button to summarize YouTube videos
- 🔧 **DOM Automation** - Can interact with pages (click, type, scroll)

## Installation

1. Clone or download this repo:
   ```bash
   git clone https://github.com/shersingh7/grok-browser-agent.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked**

5. Select the `grok-browser-agent` folder

6. Open Grok in Chrome at [grok.com](https://grok.com) and log in

7. Click the extension icon or go to Chrome's side panel

## How It Works

The extension embeds grok.com in a Chrome side panel. It:

- Strips iframe headers to allow embedding
- Injects scripts to automate input
- Reads page content to provide context
- Works with your existing Grok login (no API key needed)

## Files

```
├── manifest.json      # Extension config
├── background.js      # Service worker
├── content.js         # Content script (all pages)
├── grok-injector.js   # Grok-specific injection
├── grok-client.js     # Grok API client
├── popup.html/js      # Extension popup
├── sidepanel.html/js  # Side panel UI
├── styles.css         # Dark theme styling
├── utils.js           # Utilities
└── assets/            # Icons
```

## Requirements

- Chrome 116+ (for side panel API)
- A Grok account (login at grok.com first)

## Disclaimer

This is an unofficial extension. Grok is a trademark of xAI. This extension is not affiliated with or endorsed by xAI.

## License

MIT License - Use freely for personal or commercial projects.

---

Created January 2026 | Vibe coded with AI assistance