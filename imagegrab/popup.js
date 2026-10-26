const store = chrome.storage.session || chrome.storage.local;

store.get('imagegrab_payload', (data) => {
  const payload = data.imagegrab_payload;
  const count = payload && Array.isArray(payload.images) ? payload.images.length : 0;
  document.getElementById('count').textContent = String(count);
  document.getElementById('hint').textContent = count
    ? (payload.pageTitle || '已提取图片')
    : '在商品详情页点击右下角「获取图片」后，这里会显示数量。';
  const button = document.getElementById('openGallery');
  button.disabled = count === 0;
  button.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
    window.close();
  });
});
