# Grok Browser Agent

A polished Chrome extension that brings Grok AI directly into your browser via a sleek, responsive side panel.

## Features

- **Side Panel Integration** — Grok AI in a persistent, beautifully designed side panel
- **Responsive UI** — Adapts to narrow and wide panel widths, smooth animations, glassmorphism accents
- **Page Context** — Send current page content to Grok for analysis with one click
- **Article Extraction** — Intelligently extracts readable article text (not raw HTML) for better context
- **YouTube Summarization** — Quick button to summarize YouTube videos when you're on one
- **History** — Keeps a history of sent context so you can resend with one click
- **Keyboard Shortcuts** — `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) to open the panel; `Ctrl+Shift+H` for history
- **Settings** — Configure what data gets sent, toggle features, and manage privacy
- **Toast Notifications** — Non-intrusive feedback instead of annoying `alert()` popups
- **Connection Status** — Real-time indicator showing if Grok iframe is loaded and ready
- **DOM Automation** — Can interact with pages (click, type, scroll) for agentic workflows

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

7. Click the extension icon or press `Ctrl+Shift+G` to open the side panel

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Open side panel |
| `Ctrl+Shift+H` | Toggle history drawer (inside side panel) |
| `Esc` | Close history drawer |

To customize shortcuts, go to `chrome://extensions/shortcuts`.

## How It Works

The extension embeds `grok.com` in a Chrome side panel. It:

- Strips iframe headers to allow embedding via `declarativeNetRequest`
- Spoofs a mobile User-Agent so Grok renders in a responsive layout perfect for sidebars
- Injects scripts to automate text input into Grok's chat box
- Reads page content intelligently to provide rich context
- Works with your existing Grok login — no API key needed

## Files

```
├── manifest.json      # Extension config
├── background.js      # Service worker, header stripping, message routing
├── content.js         # Content script — DOM snapshots, article extraction, actions
├── grok-injector.js   # Injected into grok.com iframe to fill the chat input
├── grok-client.js     # Grok API client (for future programmatic use)
├── popup.html/js      # Extension popup — quick actions, status, recent activity
├── sidepanel.html/js  # Side panel UI — Grok iframe, toolbar, history, toasts
├── options.html/js    # Settings page — configure context, privacy, shortcuts
├── styles.css         # Complete design system — dark theme, responsive, animations
├── utils.js           # Shared utilities
└── assets/            # Icons
```

## Settings

Open the settings page by clicking the gear icon in the side panel or popup.

- **Auto-open side panel** — Open panel when clicking the extension icon
- **Show page indicator** — Display current page title in the toolbar
- **Send full page HTML** — Include raw HTML (uses more tokens; off by default)
- **Send article text** — Extract readable article text (on by default)
- **History** — Save recent context injections for quick reuse

## Privacy

All data stays local:
- Page content is read from the active tab and sent directly to Grok
- History is stored in `chrome.storage.local` only
- No external servers, no analytics, no tracking
- You control exactly what gets sent via the Settings page

## Requirements

- Chrome 116+ (for side panel API)
- A Grok account (login at grok.com first)

## Changelog

### v1.1.0
- Complete UI overhaul with modern dark theme, glassmorphism, and animations
- Added article text extraction (Readability-like algorithm)
- Added history drawer with resend support
- Added toast notification system
- Added settings/options page
- Added keyboard shortcuts (`Ctrl+Shift+G`, `Ctrl+Shift+H`)
- Added connection status indicators
- Added recent activity in popup
- Improved Grok input detection with multiple fallback selectors
- Improved error handling and user feedback
- Responsive design for all panel widths

### v1.0.0
- Initial release

## Disclaimer

This is an unofficial extension. Grok is a trademark of xAI. This extension is not affiliated with or endorsed by xAI.

## License

MIT License — Use freely for personal or commercial projects.

---

Created by [shersingh7](https://github.com/shersingh7) | Vibe coded with AI assistance
