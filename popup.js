document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const openPanelBtn = document.getElementById('open-panel-btn');

    // Basic status check (mocked for now, will connect to background later)
    // In a real implementation we would send a message to background.js to check cookies

    // Check if we have permissions for grok.com
    chrome.permissions.contains({
        origins: ['https://grok.com/*']
    }, (result) => {
        if (result) {
            checkAuth();
        } else {
            statusText.innerText = "Permissions needed";
            statusDot.style.backgroundColor = "orange";
        }
    });

    openPanelBtn.addEventListener('click', () => {
        // Side panel opening is usually manual or programmatic in specific contexts
        // Chrome 116+ supports opening programmatically from user action
        if (chrome.sidePanel && chrome.sidePanel.open) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.sidePanel.open({ windowId: tabs[0].windowId });
                    window.close();
                }
            });
        } else {
            // Fallback instruction
            statusText.innerText = "Click the Side Panel icon in Chrome toolbar";
        }
    });

    async function checkAuth() {
        // Send message to background to check login
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
            if (response && response.isAuthenticated) {
                statusText.innerText = "Connected to Grok";
                statusDot.style.backgroundColor = "#4CAF50"; // Green
                document.querySelector('.text-secondary').innerText = "Ready to browse.";
            } else {
                statusText.innerText = "Not logged in";
                statusDot.style.backgroundColor = "#ff4d4d"; // Red
            }
        });
    }
});
