// Content Script
console.log("Grok Agent Content Script Loaded v1.1");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'READ_DOM') {
        const snapshot = createDOMSnapshot();
        sendResponse({
            dom: snapshot,
            url: window.location.href,
            title: document.title
        });
    }

    if (request.type === 'READ_ARTICLE') {
        const article = extractArticleText();
        sendResponse({
            article: article,
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
        return true;
    }
});

// --- DOM Snapshotting ---
function createDOMSnapshot() {
    try {
        const clone = document.body.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, noscript, iframe, svg, img, video, audio, canvas, nav, header, footer, aside, [role="banner"], [role="navigation"], [role="complementary"]');
        scripts.forEach(n => n.remove());

        const cleaner = document.createNodeIterator(clone, NodeFilter.SHOW_COMMENT, null, false);
        let curr;
        while (curr = cleaner.nextNode()) {
            curr.parentNode.removeChild(curr);
        }

        let html = "";
        try {
            html = clone.innerHTML.replace(/\s+/g, ' ').trim();
        } catch (err) {
            html = clone.innerText;
        }

        if (html.length > 100000) html = html.substring(0, 100000) + "... (Truncated)";
        return html;
    } catch (e) {
        console.error("Snapshot error", e);
        return document.body.innerText.substring(0, 20000);
    }
}

// --- Article Text Extraction ---
function extractArticleText() {
    try {
        // Try Mozilla Readability-like extraction
        let bestElement = null;
        let bestScore = 0;

        const candidates = document.querySelectorAll('article, [role="main"], .post-content, .entry-content, .article-body, .story-body, .content-body, main, #content, .content');
        if (candidates.length > 0) {
            for (const el of candidates) {
                const text = el.innerText || '';
                const score = text.length;
                if (score > bestScore) {
                    bestScore = score;
                    bestElement = el;
                }
            }
        }

        // Fallback: score paragraphs
        if (!bestElement || bestScore < 500) {
            const paragraphs = document.querySelectorAll('p');
            const parentScores = new Map();
            for (const p of paragraphs) {
                const text = (p.innerText || '').trim();
                if (text.length < 50) continue;
                let parent = p.parentElement;
                for (let i = 0; i < 3 && parent; i++) {
                    const tag = parent.tagName.toLowerCase();
                    if (tag === 'body' || tag === 'html') break;
                    const current = parentScores.get(parent) || 0;
                    parentScores.set(parent, current + text.length);
                    parent = parent.parentElement;
                }
            }
            for (const [el, score] of parentScores) {
                if (score > bestScore) {
                    bestScore = score;
                    bestElement = el;
                }
            }
        }

        if (bestElement) {
            // Clean up the element clone
            const clone = bestElement.cloneNode(true);
            const removeSelectors = 'script, style, noscript, iframe, svg, img, video, audio, canvas, form, input, button, .advertisement, .ad, .social-share, .comments, nav, header, footer';
            clone.querySelectorAll(removeSelectors).forEach(n => n.remove());

            let text = (clone.innerText || '').trim();
            // Normalize whitespace
            text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ');
            return text;
        }

        return document.body.innerText.substring(0, 15000);
    } catch (e) {
        console.error("Article extraction error", e);
        return document.body.innerText.substring(0, 15000);
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
    const originalTransition = element.style.transition;
    element.style.transition = 'outline 0.2s ease';
    element.style.outline = "2px solid rgba(255, 255, 255, 0.6)";
    element.style.outlineOffset = "2px";
    setTimeout(() => {
        element.style.outline = original;
        element.style.outlineOffset = "";
        element.style.transition = originalTransition;
    }, 1200);
}
