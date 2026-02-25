// Background Service Worker
try {
    importScripts('utils.js', 'grok-client.js');
} catch (e) {
    console.error(e);
}

const grokClient = new GrokWebClient();

// Initial setup
grokClient.init();
// Enable clicking icon to open side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Listeners
// Header Stripper for Iframe Support
// ... (DeclarativeNetRequest logic stays same)

// Keep track of frame
// activeGrokFrame not needed anymore - using postMessage from sidepanel

// Clean up if tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
    // No-op
});
const RULE_ID = 1;

function updateDynamicRules() {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
            "id": RULE_ID,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [
                    // Spoof Mobile User Agent to force responsive mobile layout in sidebar
                    { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }
                ],
                "responseHeaders": [
                    { "header": "x-frame-options", "operation": "remove" },
                    { "header": "content-security-policy", "operation": "remove" },
                    { "header": "frame-options", "operation": "remove" }
                ]
            },
            "condition": {
                "urlFilter": "*",
                "initiatorDomains": [chrome.runtime.id],
                "resourceTypes": ["sub_frame", "xmlhttprequest"]
            }
        }],
        removeRuleIds: [RULE_ID]
    });
}

// Apply rules on startup
updateDynamicRules();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Return true to indicate we will respond asynchronously
    handleMessage(request, sender, sendResponse);
    return true;
});

async function handleMessage(request, sender, sendResponse) {
    if (request.type === 'CHECK_AUTH') {
        sendResponse({ isAuthenticated: true }); // Assume verified
    }

    if (request.type === 'CHECK_URL') {
        // Get active tab info for UI toggles
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                sendResponse({ url: tabs[0].url });
            } else {
                sendResponse({ url: "" });
            }
        });
        return true; // Async
    }

    if (request.type === 'AGENT_REQUEST') {
        const { mode } = request;

        try {
            // 1. Get Active Tab (User's context)
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

            if (!tab || !tab.id) {
                sendResponse({ error: "No active tab found." });
                return;
            }

            // 2. Construct Prompt
            let fullPrompt = "";
            const title = tab.title || "No Title";
            const url = tab.url || "";

            if (mode === 'YOUTUBE') {
                fullPrompt = `URL: ${url}\nTitle: ${title}\nPrompt: Summarize the video in bullet points.`;
            } else {
                fullPrompt = `URL: ${url}\nTitle: ${title}\nPrompt: `;
            }

            // 3. Send to Grok Frame
            // Skipped in background - handled by sidepanel via postMessage
            const injected = false;

            // ALWAYS return the text so sidepanel can copy to clipboard
            sendResponse({ success: true, injected: injected, contextText: fullPrompt });

        } catch (error) {
            console.error(error);
            sendResponse({ error: error.message });
        }
    }
}

async function checkGrokSession() {
    return true;
}

// Helper to wrap tab messaging in Promise
function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}
