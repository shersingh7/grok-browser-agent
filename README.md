# Grok Browser Agent

A Chrome extension that brings Grok AI directly into your browser.

## What It Does

- Side panel integration with Grok AI
- Works on any webpage
- Injects into grok.com and x.com/i/grok
- AI-powered assistance while browsing

## Installation

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder

## Files

```
├── manifest.json      # Extension config
├── background.js      # Service worker
├── content.js         # Content script (all pages)
├── grok-injector.js   # Grok-specific injection
├── grok-client.js     # Grok API client
├── popup.html/js      # Extension popup
├── sidepanel.html/js  # Side panel UI
├── styles.css         # Styling
├── utils.js           # Utilities
└── assets/            # Icons
```

## Created

January 2026 - Vibe coded with AI assistance

## License

Private - For personal use