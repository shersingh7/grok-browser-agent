document.addEventListener('DOMContentLoaded', async () => {
  const settings = {
    autoOpen: document.getElementById('setting-auto-open'),
    pageIndicator: document.getElementById('setting-page-indicator'),
    fullHtml: document.getElementById('setting-full-html'),
    articleText: document.getElementById('setting-article-text'),
    history: document.getElementById('setting-history'),
  };

  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Load saved settings
  try {
    const result = await chrome.storage.local.get('grokSettings');
    const saved = result.grokSettings || {};
    if (settings.autoOpen) settings.autoOpen.checked = saved.autoOpen !== false;
    if (settings.pageIndicator) settings.pageIndicator.checked = saved.pageIndicator !== false;
    if (settings.fullHtml) settings.fullHtml.checked = saved.fullHtml === true;
    if (settings.articleText) settings.articleText.checked = saved.articleText !== false;
    if (settings.history) settings.history.checked = saved.history !== false;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  // Save on change
  Object.values(settings).forEach(el => {
    if (!el) return;
    el.addEventListener('change', saveSettings);
  });

  async function saveSettings() {
    const data = {
      autoOpen: settings.autoOpen ? settings.autoOpen.checked : true,
      pageIndicator: settings.pageIndicator ? settings.pageIndicator.checked : true,
      fullHtml: settings.fullHtml ? settings.fullHtml.checked : false,
      articleText: settings.articleText ? settings.articleText.checked : false,
      history: settings.history ? settings.history.checked : true,
    };
    try {
      await chrome.storage.local.set({ grokSettings: data });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      try {
        await chrome.storage.local.remove(['recentActivity', 'sidepanelHistory']);
        clearHistoryBtn.innerText = 'Cleared!';
        setTimeout(() => { clearHistoryBtn.innerText = 'Clear'; }, 2000);
      } catch (e) {
        clearHistoryBtn.innerText = 'Error';
      }
    });
  }
});
