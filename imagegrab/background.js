/**
 * 图提取 ImageGrab - 后台 Service Worker
 * 接收内容脚本提取到的图片列表，写入 storage 并打开画廊页面。
 */
const store = chrome.storage.session || chrome.storage.local;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'IMAGE_GRAB_OPEN') {
    const images = Array.isArray(message.images)
      ? message.images.filter(item => typeof item === 'string' && item).slice(0, 300)
      : [];

    if (!images.length) {
      sendResponse({ ok: false, error: 'empty' });
      return true;
    }

    const payload = {
      images,
      pageTitle: message.pageTitle || '',
      pageUrl: message.pageUrl || '',
      time: Date.now()
    };

    store.set({ imagegrab_payload: payload }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'tab_failed' });
          return;
        }
        sendResponse({ ok: true, count: images.length, tabId: tab.id });
      });
    });
    return true;
  }

  if (message.type === 'IMAGE_GRAB_GET') {
    store.get('imagegrab_payload', (data) => {
      sendResponse({ ok: true, payload: data.imagegrab_payload || null });
    });
    return true;
  }

  if (message.type === 'IMAGE_GRAB_CLEAR') {
    store.remove('imagegrab_payload', () => sendResponse({ ok: true }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('图提取 ImageGrab 已安装');
});
