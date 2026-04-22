document.addEventListener('DOMContentLoaded', async () => {
  const statusText = document.getElementById('status-text');
  const statusDot = document.getElementById('status-dot');
  const statusBadge = document.getElementById('status-badge');
  const statusDesc = document.getElementById('status-desc');
  const openPanelBtn = document.getElementById('open-panel-btn');
  const pageContextBtn = document.getElementById('page-context-btn');
  const summarizeBtn = document.getElementById('summarize-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const recentList = document.getElementById('recent-list');
  const clearRecentBtn = document.getElementById('clear-recent-btn');

  // Check auth and tab state
  await checkAuth();
  await checkCurrentTab();
  await loadRecentActivity();

  // Event listeners
  openPanelBtn.addEventListener('click', openSidePanel);
  pageContextBtn.addEventListener('click', () => sendContext('PAGE'));
  summarizeBtn.addEventListener('click', () => sendContext('YOUTUBE'));
  settingsBtn.addEventListener('click', openSettings);
  clearRecentBtn.addEventListener('click', clearRecent);

  async function checkAuth() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      if (response && response.isAuthenticated) {
        setStatus('connected', 'Connected', 'Ready to browse with Grok.');
      } else {
        setStatus('warning', 'Not logged in', 'Open grok.com and log in to use the agent.');
      }
    } catch (e) {
      setStatus('error', 'Error', 'Could not check authentication status.');
    }
  }

  function setStatus(state, text, desc) {
    statusText.innerText = text;
    statusDesc.innerText = desc;
    statusDot.className = 'status-dot';
    statusBadge.className = 'badge';

    if (state === 'connected') {
      statusDot.classList.add('active');
      statusBadge.classList.add('badge-success');
      statusBadge.innerText = 'Ready';
    } else if (state === 'warning') {
      statusDot.classList.add('warning');
      statusBadge.classList.add('badge-warning');
      statusBadge.innerText = 'Login Needed';
    } else {
      statusDot.classList.add('error');
      statusBadge.classList.add('badge-error');
      statusBadge.innerText = 'Error';
    }
  }

  async function checkCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0]) return;
      const url = tabs[0].url || '';
      const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
      const isWebPage = url.startsWith('http') && !url.startsWith('chrome://');

      if (isYouTube) {
        summarizeBtn.disabled = false;
        document.getElementById('summarize-label').innerText = 'Summarize this video';
      } else if (isWebPage) {
        summarizeBtn.disabled = true;
        document.getElementById('summarize-label').innerText = 'YouTube only';
      } else {
        pageContextBtn.disabled = true;
        summarizeBtn.disabled = true;
        document.getElementById('summarize-label').innerText = 'Not on a page';
      }
    } catch (e) {}
  }

  async function openSidePanel() {
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.sidePanel.open({ windowId: tabs[0].windowId });
          window.close();
        }
      }
    } catch (e) {
      statusDesc.innerText = 'Click the Side Panel icon in Chrome toolbar.';
    }
  }

  async function sendContext(mode) {
    try {
      const btn = mode === 'YOUTUBE' ? summarizeBtn : pageContextBtn;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';

      const response = await chrome.runtime.sendMessage({ type: 'AGENT_REQUEST', mode });

      if (response && response.contextText) {
        // Also inject directly if sidepanel is open
        await chrome.runtime.sendMessage({
          type: 'INJECT_TO_SIDEPANEL',
          text: response.contextText
        });

        // Show toast via sidepanel or fallback
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Sent!</span>
        `;

        // Add to recent
        await addRecentActivity(mode, response.title || 'Current Page');
      } else if (response && response.error) {
        throw new Error(response.error);
      }

      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
      }, 1500);
    } catch (e) {
      const btn = mode === 'YOUTUBE' ? summarizeBtn : pageContextBtn;
      btn.innerHTML = '<span style="color:var(--error)">Failed</span>';
      setTimeout(() => {
        btn.innerHTML = mode === 'YOUTUBE'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Summarize</span><span class="quick-action-label" id="summarize-label">YouTube only</span>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Page Context</span><span class="quick-action-label">Send current page</span>';
        btn.disabled = false;
      }, 1500);
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  async function loadRecentActivity() {
    try {
      const result = await chrome.storage.local.get('recentActivity');
      const items = result.recentActivity || [];
      renderRecent(items);
    } catch (e) {
      renderRecent([]);
    }
  }

  function renderRecent(items) {
    if (!items.length) {
      recentList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          <div class="text-xs text-muted">No recent activity yet</div>
        </div>
      `;
      clearRecentBtn.style.display = 'none';
      return;
    }

    clearRecentBtn.style.display = 'inline-flex';
    recentList.innerHTML = items.slice(0, 5).map((item, i) => {
      const time = formatTime(item.timestamp);
      const icon = item.mode === 'YOUTUBE' ? '▶' : '📄';
      return `
        <div class="recent-item animate-fade-in" style="animation-delay:${i*50}ms" data-index="${i}">
          <div class="recent-item-favicon">${icon}</div>
          <div class="recent-item-text truncate">${escapeHtml(item.title)}</div>
          <div class="recent-item-time">${time}</div>
        </div>
      `;
    }).join('');

    recentList.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', async () => {
        const idx = parseInt(el.dataset.index);
        const items = (await chrome.storage.local.get('recentActivity')).recentActivity || [];
        const item = items[idx];
        if (item && item.text) {
          await chrome.runtime.sendMessage({ type: 'INJECT_TO_SIDEPANEL', text: item.text });
          openSidePanel();
        }
      });
    });
  }

  async function addRecentActivity(mode, title) {
    try {
      const result = await chrome.storage.local.get('recentActivity');
      const items = result.recentActivity || [];
      const text = mode === 'YOUTUBE'
        ? `Summarize this YouTube video: ${title}`
        : `Analyze this page: ${title}`;
      items.unshift({ mode, title, text, timestamp: Date.now() });
      if (items.length > 20) items.pop();
      await chrome.storage.local.set({ recentActivity: items });
      renderRecent(items);
    } catch (e) {}
  }

  async function clearRecent() {
    await chrome.storage.local.remove('recentActivity');
    renderRecent([]);
  }

  function formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
