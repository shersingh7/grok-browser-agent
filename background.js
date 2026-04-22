// Background Service Worker
try {
    importScripts('utils.js', 'grok-client.js');
} catch (e) {
    console.error(e);
}

const grokClient = new GrokWebClient();
grokClient.init();

// Enable clicking icon to open side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Keyboard shortcut: open side panel
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-side-panel') {
        try {
            const windows = await chrome.windows.getAll({ populate: true });
            const activeWin = windows.find(w => w.focused) || windows[0];
            if (activeWin) {
                await chrome.sidePanel.open({ windowId: activeWin.id });
            }
        } catch (e) {
            console.error('Failed to open side panel:', e);
        }
    }
});

// Header Stripper for Iframe Support
const RULE_ID = 1;

function updateDynamicRules() {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
            "id": RULE_ID,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [
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

updateDynamicRules();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true;
});

async function handleMessage(request, sender, sendResponse) {
    if (request.type === 'CHECK_AUTH') {
        sendResponse({ isAuthenticated: true });
        return;
    }

    if (request.type === 'CHECK_URL') {
        try {
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (tabs && tabs[0]) {
                sendResponse({ url: tabs[0].url, title: tabs[0].title });
            } else {
                sendResponse({ url: "", title: "" });
            }
        } catch (e) {
            sendResponse({ url: "", title: "" });
        }
        return;
    }

    if (request.type === 'INJECT_TO_SIDEPANEL') {
        // Relay to sidepanel if it's open
        try {
            const views = chrome.extension.getViews({ type: 'tab' });
            let sent = false;
            for (const view of views) {
                if (view.location.pathname.includes('sidepanel.html') && view.injectToGrok) {
                    view.injectToGrok(request.text);
                    sent = true;
                }
            }
            sendResponse({ success: sent });
        } catch (e) {
            sendResponse({ success: false, error: e.message });
        }
        return;
    }

    if (request.type === 'AGENT_REQUEST') {
        const { mode } = request;
        try {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (!tab || !tab.id) {
                sendResponse({ error: "No active tab found." });
                return;
            }

            const title = tab.title || "No Title";
            const url = tab.url || "";
            const settings = await getSettings();

            let fullPrompt = "";

            if (mode === 'YOUTUBE') {
                fullPrompt = `URL: ${url}\nTitle: ${title}\nPrompt: Summarize the video in bullet points. Include key takeaways and timestamps if possible.`;
            } else if (mode === 'ARTICLE') {
                // Try to extract article text
                let articleText = "";
                try {
                    const resp = await sendMessageToTab(tab.id, { type: 'READ_ARTICLE' });
                    if (resp && resp.article) {
                        articleText = resp.article;
                    }
                } catch (e) {
                    console.log('Article extraction failed, falling back to basic context');
                }

                if (articleText && settings.articleText === true) {
                    const truncated = articleText.length > 12000 ? articleText.substring(0, 12000) + "\n\n[Article truncated...]" : articleText;
                    fullPrompt = `URL: ${url}\nTitle: ${title}\n\nArticle Text:\n${truncated}\n\nPrompt: Summarize the key points of this article. Be concise but thorough.`;
                } else {
                    fullPrompt = `URL: ${url}\nTitle: ${title}\nPrompt: Summarize the key points of this page. Be concise but thorough.`;
                }
            } else {
                // PAGE mode
                let domSnapshot = "";
                if (settings.fullHtml === true) {
                    try {
                        const resp = await sendMessageToTab(tab.id, { type: 'READ_DOM' });
                        if (resp && resp.dom) {
                            domSnapshot = resp.dom;
                        }
                    } catch (e) {
                        console.log('DOM read failed');
                    }
                }

                if (domSnapshot) {
                    const truncated = domSnapshot.length > 8000 ? domSnapshot.substring(0, 8000) + "\n\n[Content truncated...]" : domSnapshot;
                    fullPrompt = `URL: ${url}\nTitle: ${title}\n\nPage Content:\n${truncated}\n\nPrompt: Analyze this page and answer any questions about it.`;
                } else {
                    fullPrompt = `URL: ${url}\nTitle: ${title}\nPrompt: Analyze this page and answer any questions about it.`;
                }
            }

            sendResponse({ success: true, contextText: fullPrompt, title, url });
        } catch (error) {
            console.error(error);
            sendResponse({ error: error.message });
        }
    }
}

async function getSettings() {
    try {
        const result = await chrome.storage.local.get('grokSettings');
        return result.grokSettings || {};
    } catch (e) {
        return {};
    }
}

async function checkGrokSession() {
    return true;
}

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
