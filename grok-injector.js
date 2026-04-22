/**
 * Grok Injector
 * Runs inside the iframe on grok.com to automate input.
 */

console.log("Grok Injector: Loaded inside iframe.");

// Announce presence
chrome.runtime.sendMessage({ type: 'GROK_FRAME_READY' });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FILL_PROMPT') {
        fillPrompt(request.prompts);
        sendResponse({ success: true });
    }
});

// Listen for direct messages from the Side Panel (parent window)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FILL_PROMPT' && event.data.prompt) {
        fillPrompt(event.data.prompt);
    }
});

async function fillPrompt(text) {
    console.log("Grok Injector: Filling prompt...", text.substring(0, 60));

    // Try multiple selector strategies in order of specificity
    const selectors = [
        '.ProseMirror',
        '[contenteditable="true"]',
        'textarea',
        'div[role="textbox"]',
        'input[type="text"]'
    ];

    let input = null;
    for (const sel of selectors) {
        input = document.querySelector(sel);
        if (input) break;
    }

    // Also try finding by placeholder text
    if (!input) {
        const placeholders = ['Ask anything', 'Message', 'Search', 'Type a message'];
        for (const ph of placeholders) {
            input = document.querySelector(`[placeholder*="${ph}" i]`);
            if (input) break;
        }
    }

    if (!input) {
        console.warn("Grok Injector: Could not find chat input.");
        // Visual feedback instead of alert
        showInjectorToast("Couldn't find the chat input. Please click the text box and try again.");
        return;
    }

    input.focus();
    await new Promise(r => setTimeout(r, 80));

    // Scroll input into view
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        const nativeSetter = Object.getOwnPropertyDescriptor(
            input.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype,
            "value"
        )?.set;

        if (nativeSetter) {
            nativeSetter.call(input, text);
        } else {
            input.value = text;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (input.tagName === 'TEXTAREA') {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        }
    } else if (input.isContentEditable || input.getAttribute('contenteditable') === 'true') {
        // ContentEditable (ProseMirror / Tiptap)
        try {
            // Select all existing content first
            const range = document.createRange();
            range.selectNodeContents(input);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const success = document.execCommand('insertText', false, text);
            if (!success) throw new Error("execCommand failed");
        } catch (e) {
            // Fallback: direct text replacement
            input.innerHTML = '';
            const textNode = document.createTextNode(text);
            input.appendChild(textNode);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    console.log("Grok Injector: Text injected successfully.");

    // Brief visual flash on the input to confirm injection
    const originalTransition = input.style.transition;
    input.style.transition = 'box-shadow 0.3s ease';
    input.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.15)';
    setTimeout(() => {
        input.style.boxShadow = '';
        input.style.transition = originalTransition;
    }, 800);
}

function showInjectorToast(message) {
    // Create a toast inside the Grok iframe since we can't use the sidepanel's toast
    const existing = document.getElementById('grok-agent-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'grok-agent-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a1e;
        color: #f0f0f5;
        padding: 10px 18px;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        z-index: 99999;
        animation: fadeIn 0.25s ease;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;

    const style = document.createElement('style');
    style.textContent = `@keyframes fadeIn { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
