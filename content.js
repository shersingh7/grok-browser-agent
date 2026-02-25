// Content Script
console.log("Grok Agent Content Script Loaded");

// --- API ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'READ_DOM') {
        const snapshot = createDOMSnapshot();
        sendResponse({
            dom: snapshot,
            url: window.location.href,
            title: document.title
        });
    }

    if (request.type === 'EXECUTE_ACTION') {
        executeAction(request.action).then(result => {
            sendResponse({ success: true, result });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // Async
    }
});

// --- DOM Snapshotting ---
function createDOMSnapshot() {
    // User requested "Copy all html" - but raw HTML is too big for context usually.
    // Cleaned HTML is better for history.
    try {
        // Clone body to avoid modifying live page
        const clone = document.body.cloneNode(true);
        // Remove scripts, styles, and other non-content elements
        const scripts = clone.querySelectorAll('script, style, noscript, iframe, svg, img, video, audio, canvas');
        scripts.forEach(n => n.remove());

        // Remove comments
        const cleaner = document.createNodeIterator(clone, NodeFilter.SHOW_COMMENT, null, false);
        let curr;
        while (curr = cleaner.nextNode()) {
            curr.parentNode.removeChild(curr);
        }

        // Return cleaned HTML
        // Truncate to avoid clipboard/memory crash on massive pages. Increased limit to 100k.
        let html = "";
        try {
            html = clone.innerHTML.replace(/\s+/g, ' ').trim();
        } catch (err) {
            html = clone.innerText; // Fallback
        }

        if (html.length > 100000) html = html.substring(0, 100000) + "... (Truncated)";
        return html;
    } catch (e) {
        console.error("Snapshot error", e);
        return document.body.innerText.substring(0, 20000);
    }
}

// --- Action Execution ---
async function executeAction(action) {
    console.log("Executing Action:", action);
    const { type, selector, value } = action;

    const element = findElement(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    if (type === 'click') {
        highlight(element);
        element.click();
        element.focus();
        return "Clicked";
    }

    if (type === 'type') {
        highlight(element);
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return "Typed";
    }

    if (type === 'scroll') {
        // value can be 'up', 'down', 'top', 'bottom'
        if (value === 'bottom') window.scrollTo(0, document.body.scrollHeight);
        else if (value === 'top') window.scrollTo(0, 0);
        else window.scrollBy(0, value === 'up' ? -500 : 500);
        return "Scrolled";
    }

    throw new Error("Unknown action type");
}

function findElement(selector) {
    if (selector.startsWith('grok-id-')) {
        return document.querySelector(`[data-grok-id="${selector}"]`);
    }
    return document.querySelector(selector) || document.getElementById(selector);
}

function highlight(element) {
    const original = element.style.outline;
    element.style.outline = "2px solid #f00";
    setTimeout(() => {
        element.style.outline = original;
    }, 1000);
}
