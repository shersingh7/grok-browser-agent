/**
 * Grok Injector
 * Runs inside the iframe on grok.com to automate input.
 */

console.log("Grok Injector: Loaded inside iframe.");

// Announce presence to background script so it knows where to send prompts
chrome.runtime.sendMessage({ type: 'GROK_FRAME_READY' });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FILL_PROMPT') {
        fillPrompt(request.prompts);
        sendResponse({ success: true });
    }
});

// Listen for direct messages from the Side Panel (parent window)
window.addEventListener('message', (event) => {
    // Optional: Check origin if needed, but for now we accept to ensure it works.
    // console.log("Grok Injector received window message:", event.data);
    if (event.data && event.data.type === 'FILL_PROMPT' && event.data.prompt) {
        fillPrompt(event.data.prompt);
    }
});

async function fillPrompt(text) {
    console.log("Grok Injector: Filling prompt...", text.substring(0, 50));

    // Priority 1: ProseMirror (Grok's specific editor)
    let input = document.querySelector('.ProseMirror');

    // Priority 2: Generic ContentEditable
    if (!input) {
        input = document.querySelector('div[contenteditable="true"]');
    }

    // Priority 3: Textarea
    if (!input) {
        input = document.querySelector('textarea');
    }

    if (input) {
        input.focus();
        await new Promise(r => setTimeout(r, 50)); // Wait for focus

        if (input.tagName === 'TEXTAREA') {
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            if (nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(input, text);
            } else {
                input.value = text;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        } else {
            // ContentEditable (ProseMirror/Tiptap)
            // execCommand 'insertText' is the best way to simulate user input for these editors
            try {
                // Clear existing content if it fits the "new prompt" paradigm, 
                // but simpler to just replace/insert. 
                // If we want to replace everything, we should select all first.
                // For now, let's just insert.
                const success = document.execCommand('insertText', false, text);
                if (!success) throw new Error("execCommand failed");
            } catch (e) {
                // Fallback
                input.textContent = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        console.log("Grok Injector: Text injected.");

        // Attempt to hit Enter if requested? No, user might want to review.
    } else {
        console.warn("Grok Injector: Could not find chat input.");
        alert("Grok Browser Agent: I couldn't find the chat box! Please click on the 'Ask anything' box and try again.");
    }
}
