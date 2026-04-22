document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.getElementById('grok-frame');
  const loadingOverlay = document.getElementById('loading-overlay');
  const contextBtn = document.getElementById('context-btn');
  const ytBtn = document.getElementById('yt-summary-btn');
  const extractBtn = document.getElementById('extract-article-btn');
  const reloadBtn = document.getElementById('reload-frame-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const historyToggle = document.getElementById('history-toggle');
  const historyClose = document.getElementById('history-close');
  const historyDrawer = document.getElementById('history-drawer');
  const historyList = document.getElementById('history-list');
  const connDot = document.getElementById('conn-dot');
  const connStatusDot = document.getElementById('conn-status-dot');
  const connStatusText = document.getElementById('conn-status-text');
  const connPageUrl = document.getElementById('conn-page-url');
  const pageIndicator = document.getElementById('page-indicator');
  const toastContainer = document.getElementById('toast-container');

  let isFrameLoaded = false;
  let loadTimeout = null;

  // Iframe load handling with timeout
  if (iframe) {
    loadTimeout = setTimeout(() => {
      if (!isFrameLoaded) {
        showToast('Grok is taking a while to load. Try reloading.', 'warning');
      }
    }, 15000);

    iframe.onload = () => {
      isFrameLoaded = true;
      clearTimeout(loadTimeout);
      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        setTimeout(() => loadingOverlay.style.display = 'none', 350);
      }
      updateConnectionStatus(true);
      console.log('Sidepanel: Grok frame loaded.');
    };

    iframe.onerror = () => {
      updateConnectionStatus(false);
      showToast('Failed to load Grok. Check your connection.', 'error');
    };
  }

  // Toolbar buttons
  if (contextBtn) {
    contextBtn.addEventListener('click', async () => handleContextRequest('PAGE'));
  }
  if (ytBtn) {
    ytBtn.addEventListener('click', async () => handleContextRequest('YOUTUBE'));
  }
  if (extractBtn) {
    extractBtn.addEventListener('click', async () => handleContextRequest('ARTICLE'));
  }
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      isFrameLoaded = false;
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.remove('hidden');
      }
      iframe.src = iframe.src;
      updateConnectionStatus(false);
      showToast('Reloading Grok...', 'info');
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }

  // History drawer
  if (historyToggle) {
    historyToggle.addEventListener('click', () => {
      historyDrawer.classList.toggle('open');
      if (historyDrawer.classList.contains('open')) loadHistory();
    });
  }
  if (historyClose) {
    historyClose.addEventListener('click', () => historyDrawer.classList.remove('open'));
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + H = toggle history
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      historyDrawer.classList.toggle('open');
      if (historyDrawer.classList.contains('open')) loadHistory();
    }
    // Escape = close history
    if (e.key === 'Escape') {
      historyDrawer.classList.remove('open');
    }
  });

  // Periodic URL check
  checkURL();
  setInterval(checkURL, 3000);

  // Listen for injected messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INJECT_TO_SIDEPANEL' && request.text) {
      injectToGrok(request.text);
      sendResponse({ success: true });
    }
    return true;
  });

  async function handleContextRequest(mode) {
    const btn = mode === 'YOUTUBE' ? ytBtn : mode === 'ARTICLE' ? extractBtn : contextBtn;
    if (!btn) return;

    try {
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';

      const response = await chrome.runtime.sendMessage({ type: 'AGENT_REQUEST', mode });

      if (response && response.contextText) {
        await injectToGrok(response.contextText);
        showToast(mode === 'YOUTUBE' ? 'Video context sent to Grok' : 'Page context sent to Grok', 'success');
        await addToHistory(mode, response.title || 'Current Page', response.contextText);
      } else if (response && response.error) {
        throw new Error(response.error);
      }

      btn.innerHTML = originalHTML;
      btn.disabled = false;
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Failed to send context', 'error');
      if (btn) {
        btn.innerHTML = mode === 'YOUTUBE'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><span>Summarize Video</span>'
          : mode === 'ARTICLE'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg><span>Read Article</span>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Page Context</span>';
        btn.disabled = false;
      }
    }
  }

  async function injectToGrok(text) {
    if (!iframe || !iframe.contentWindow) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard (Grok iframe not ready)', 'warning');
      return;
    }
    iframe.contentWindow.postMessage({ type: 'FILL_PROMPT', prompt: text }, '*');
  }

  async function checkURL() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_URL' });
      if (!response || !response.url) return;
      const url = response.url;
      const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
      const isReadable = url.startsWith('http') && !url.startsWith('chrome://');

      if (ytBtn) ytBtn.style.display = isYouTube ? 'inline-flex' : 'none';
      if (extractBtn) extractBtn.style.display = (isReadable && !isYouTube) ? 'inline-flex' : 'none';
      if (pageIndicator) pageIndicator.innerText = response.title || new URL(url).hostname;
      if (connPageUrl) connPageUrl.innerText = new URL(url).hostname;
    } catch (e) {}
  }

  function updateConnectionStatus(connected) {
    if (connected) {
      connDot.className = 'status-dot active';
      connDot.style.width = '6px';
      connDot.style.height = '6px';
      connStatusDot.className = 'status-dot active';
      connStatusDot.style.width = '6px';
      connStatusDot.style.height = '6px';
      connStatusText.innerText = 'Connected';
      connStatusText.style.color = 'var(--success)';
    } else {
      connDot.className = 'status-dot inactive';
      connStatusDot.className = 'status-dot inactive';
      connStatusText.innerText = 'Not connected';
      connStatusText.style.color = 'var(--text-muted)';
    }
  }

  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;">
        ${type === 'success'
          ? '<path d="M20 6L9 17l-5-5"/>'
          : type === 'error'
          ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
          : type === 'warning'
          ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
          : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
        }
      </svg>
      <span class="truncate">${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  async function addToHistory(mode, title, text) {
    try {
      const result = await chrome.storage.local.get('sidepanelHistory');
      const items = result.sidepanelHistory || [];
      items.unshift({ mode, title, text, timestamp: Date.now() });
      if (items.length > 50) items.pop();
      await chrome.storage.local.set({ sidepanelHistory: items });
    } catch (e) {}
  }

  async function loadHistory() {
    try {
      const result = await chrome.storage.local.get('sidepanelHistory');
      const items = result.sidepanelHistory || [];
      if (!items.length) {
        historyList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
            <div class="text-xs text-muted">No history yet</div>
          </div>
        `;
        return;
      }

      historyList.innerHTML = items.map((item, i) => {
        const time = formatTime(item.timestamp);
        const modeLabel = item.mode === 'YOUTUBE' ? 'Video' : item.mode === 'ARTICLE' ? 'Article' : 'Page';
        return `
          <div class="history-entry" data-index="${i}">
            <div class="history-entry-title truncate">${escapeHtml(item.title)}</div>
            <div class="history-entry-meta">
              <span>${modeLabel}</span>
              <span>${time}</span>
            </div>
          </div>
        `;
      }).join('');

      historyList.querySelectorAll('.history-entry').forEach(el => {
        el.addEventListener('click', async () => {
          const idx = parseInt(el.dataset.index);
          const result = await chrome.storage.local.get('sidepanelHistory');
          const items = result.sidepanelHistory || [];
          if (items[idx] && items[idx].text) {
            await injectToGrok(items[idx].text);
            showToast('Resent to Grok', 'success');
          }
        });
      });
    } catch (e) {
      historyList.innerHTML = '<div class="empty-state"><div class="text-xs text-muted">Error loading history</div></div>';
    }
  }

  function formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
