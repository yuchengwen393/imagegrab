/**
 * 图提取 ImageGrab - 内容脚本
 * 在淘宝 / 天猫 / 京东 / 拼多多商品详情页注入「获取图片」按钮，
 * 扫描页面图片并通过 background 打开画廊页面。
 */
(() => {
  'use strict';

  const ROOT_ID = 'imagegrab-root';
  if (document.getElementById(ROOT_ID)) return;

  function isProductPage() {
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();
    const search = location.search;

    if (/(^|\.)taobao\.com$/.test(host) || /(^|\.)tmall\.com$/.test(host)) {
      return /item\.htm|detail\.htm|item\.taobao|detail\.tmall/.test(path) || /[?&]id=\d+/.test(search);
    }
    if (/(^|\.)jd\.com$/.test(host)) {
      return /^\/\d+\.html/.test(path) || /product|item/.test(path);
    }
    if (/(^|\.)pinduoduo\.com$/.test(host) || /(^|\.)yangkeduo\.com$/.test(host)) {
      return /goods|detail|item/.test(path);
    }
    return false;
  }

  if (!isProductPage()) return;

  const BAD_URL = /(logo|icon|avatar|sprite|qrcode|qr-code|loading|placeholder|spacer|blank|1x1|pixel|banner|advert|promo|\.gif($|\?))/i;

  function isBadUrl(url) {
    if (!url) return true;
    if (url.startsWith('data:image/gif')) return true;
    return BAD_URL.test(url);
  }

  function normalize(raw) {
    if (!raw) return '';
    let value = String(raw).trim().replace(/^["']|["']$/g, '');
    if (!value || value === 'none') return '';
    if (value.startsWith('data:image/')) return value;
    try {
      const absolute = new URL(value, location.href).href;
      if (!/^https?:/i.test(absolute)) return '';
      return absolute;
    } catch (e) {
      return '';
    }
  }

  function pickLargestFromSrcset(srcset) {
    if (!srcset) return '';
    const parts = srcset.split(',').map(part => part.trim()).filter(Boolean);
    let best = '';
    let bestWidth = -1;
    parts.forEach(part => {
      const bits = part.split(/\s+/);
      const url = bits[0];
      const descriptor = bits[1] || '';
      const width = parseFloat(descriptor) || 0;
      if (width >= bestWidth) {
        bestWidth = width;
        best = url;
      }
    });
    return best;
  }

  function collectImages() {
    const found = new Set();

    const add = (raw) => {
      const url = normalize(raw);
      if (!url || isBadUrl(url)) return;
      found.add(url);
    };

    document.querySelectorAll('img').forEach(img => {
      // 先收懒加载属性：很多站点的 src 是 1x1 占位图，真正的图片在 data-src 里
      ['data-src', 'data-lazy-src', 'data-original', 'data-ks-lazyload', 'data-lazyload', 'data-lazy'].forEach(attr => {
        add(img.getAttribute(attr));
      });
      add(pickLargestFromSrcset(img.getAttribute('srcset')));

      const naturalW = img.naturalWidth || 0;
      const naturalH = img.naturalHeight || 0;
      const attrW = parseInt(img.getAttribute('width'), 10) || 0;
      const attrH = parseInt(img.getAttribute('height'), 10) || 0;
      const width = naturalW || attrW;
      const height = naturalH || attrH;
      if ((width && width < 100) || (height && height < 100)) return;
      if (isBadUrl(img.currentSrc || img.src)) return;
      add(img.currentSrc || img.src);
    });

    // 背景图：只扫描可见的大块元素，避免把整页的小图标都收进来
    document.querySelectorAll('div, section, a, li, header').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 120) return;
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') return;
      const matches = bg.match(/url\((["']?)(.*?)\1\)/g) || [];
      matches.forEach(item => {
        const url = item.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        add(url);
      });
    });

    return Array.from(found).slice(0, 300);
  }

  // ---------- 注入按钮 ----------
  const root = document.createElement('div');
  root.id = ROOT_ID;

  const button = document.createElement('button');
  button.className = 'ig-fab';
  button.type = 'button';
  button.setAttribute('aria-label', '获取当前商品页图片');
  button.innerHTML = `
    <span class="ig-fab-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <rect x="3.5" y="5" width="17" height="14" rx="2.2" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="9" cy="10" r="1.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="m6 16 3.4-3.6 2.7 2.6 2.1-2.2 3.4 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span class="ig-fab-label">获取图片</span>
    <span class="ig-fab-spinner" aria-hidden="true"></span>
    <span class="ig-fab-count" hidden></span>
  `;

  const toast = document.createElement('div');
  toast.className = 'ig-toast';
  toast.setAttribute('role', 'status');

  root.appendChild(button);
  root.appendChild(toast);
  (document.body || document.documentElement).appendChild(root);

  let toastTimer = 0;

  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'ig-toast ig-toast-' + type + ' ig-toast-show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'ig-toast';
    }, 2800);
  }

  function setLoading(loading) {
    button.classList.toggle('ig-loading', loading);
    button.disabled = loading;
  }

  button.addEventListener('click', () => {
    if (button.disabled) return;
    setLoading(true);
    const images = collectImages();

    if (!images.length) {
      setLoading(false);
      showToast('没有找到符合条件的商品图片', 'warn');
      return;
    }

    button.querySelector('.ig-fab-count').hidden = false;
    button.querySelector('.ig-fab-count').textContent = String(images.length);

    chrome.runtime.sendMessage({
      type: 'IMAGE_GRAB_OPEN',
      images,
      pageTitle: document.title,
      pageUrl: location.href
    }, (response) => {
      setLoading(false);
      if (chrome.runtime.lastError) {
        showToast('扩展后台未响应，请重新加载页面后再试', 'error');
        return;
      }
      if (!response || !response.ok) {
        showToast('打开图片画廊失败，请重试', 'error');
        return;
      }
      showToast('已提取 ' + response.count + ' 张图片，正在打开画廊', 'success');
    });
  });
})();
