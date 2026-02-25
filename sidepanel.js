document.addEventListener('DOMContentLoaded', () => {
    // Handle Iframe Load
    const iframe = document.getElementById('grok-frame');
    const loadingOverlay = document.getElementById('loading-overlay');
    const contextBtn = document.getElementById('context-btn');

    if (iframe) {
        iframe.onload = () => {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            console.log("Sidepanel: Grok frame loaded.");
        };
    }

    // Handle "Add Context"
    if (contextBtn) {
        contextBtn.addEventListener('click', async () => handleContextRequest(false));
    }

    // Handle "Summarize Video" (YouTube only)
    const ytBtn = document.getElementById('yt-summary-btn');
    if (ytBtn) {
        ytBtn.addEventListener('click', async () => handleContextRequest(true));
    }

    async function handleContextRequest(isYoutubeMode) {
        const btn = isYoutubeMode ? ytBtn : contextBtn;
        if (!btn) return;

        try {
            const originalText = btn.innerText;
            btn.innerText = "Reading...";

            const response = await chrome.runtime.sendMessage({
                type: 'AGENT_REQUEST',
                mode: isYoutubeMode ? 'YOUTUBE' : 'PAGE'
            });

            if (response && response.contextText) {
                await navigator.clipboard.writeText(response.contextText);
                console.log("Context copied");

                // Send directly to the iframe
                const grokFrame = document.getElementById('grok-frame');
                if (grokFrame && grokFrame.contentWindow) {
                    grokFrame.contentWindow.postMessage({
                        type: 'FILL_PROMPT',
                        prompt: response.contextText
                    }, '*');

                    btn.innerText = "Copied!";
                    console.log("Posted message to iframe");
                } else {
                    btn.innerText = "Copied!"; // Still say copied even if we couldn't auto-paste
                }
            } else if (response.error) {
                btn.innerText = "Error";
                alert("Error: " + response.error);
            }

            setTimeout(() => { btn.innerText = originalText; }, 2000);

        } catch (e) {
            console.error(e);
            btn.innerText = "Error";
            alert("System Error: " + e.message);
        }
    }

    // Check for YouTube to toggle button
    async function checkURL() {
        if (!ytBtn) return;
        try {
            const response = await chrome.runtime.sendMessage({ type: 'CHECK_URL' });
            if (response && response.url && response.url.includes("youtube.com/watch")) {
                ytBtn.style.display = 'block';
            } else {
                ytBtn.style.display = 'none';
            }
        } catch (e) { }
    }

    checkURL();
    setInterval(checkURL, 3000);
});
