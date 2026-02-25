/**
 * GrokWebClient
 * Simulates the client-side API calls to Grok's backend.
 * NOTE: This is a reverse-engineered implementation attempt.
 * It assumes a signed-in session with valid cookies.
 */

class GrokWebClient {
    constructor() {
        this.baseUrl = "https://grok.com";
        this.csrfToken = null;
    }

    async init() {
        // Attempt to fetch the home page or a config endpoint to get CSRF tokens if needed
        // For now, many modern SPAs use cookies that are automatically sent.
        console.log("GrokClient: Initializing...");
    }

    async chat(prompt, context = "", apiEndpoint) {
        // Construct the prompt with the browser context
        const fullPrompt = `You are a Browser Agent. 
        Current Page Context:
        URL: ${context.url}
        Title: ${context.title}
        
        DOM Snapshot:
        ${context.dom}
        
        User Request: ${prompt}
        
        Output your response as a JSON object with:
        - "thought": your reasoning
        - "action": { "type": "click"|"type"|"scroll", "selector": "..." "value": "..." } (optional)
        - "message": text to user (optional)
        `;

        try {
            console.log("GrokClient: Sending to", apiEndpoint);

            // Real API Call
            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                    // Cookies are sent automatically by Chrome for the domain
                },
                body: JSON.stringify({
                    model: "grok-2",
                    messages: [{ role: "user", content: fullPrompt }],
                    // Add any other fields observed in the sniffer if necessary (e.g. timezone, etc)
                })
            });

            if (response.ok) {
                const json = await response.json();
                const content = json.choices?.[0]?.message?.content || json.message || "{}";

                // Parse the JSON response from Grok (assuming it obeys the system prompt)
                try {
                    // Try to extract JSON if mixed with text
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    } else {
                        return { message: content };
                    }
                } catch (e) {
                    return { message: content };
                }
            } else {
                throw new Error(`Grok API returned ${response.status}`);
            }

        } catch (e) {
            console.error("GrokClient API Error:", e);
            throw e;
        }
    }
}

// Export for background.js
// In ES modules context or just global scope for service worker
globalThis.GrokWebClient = GrokWebClient;
