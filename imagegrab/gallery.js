/**
 * 图提取 ImageGrab - 画廊页面
 * 读取后台写入的提取结果，支持勾选、预览、单张 PNG 下载与多张 ZIP 打包。
 */
(() => {
  'use strict';

  const store = chrome.storage.session || chrome.storage.local;
  const $ = (selector) => document.querySelector(selector);

  const grid = $('#grid');
  const empty = $('#empty');
  const pageTitle = $('#pageTitle');
  const pageUrl = $('#pageUrl');
  const sourceLink = $('#sourceLink');
  const totalCount = $('#totalCount');
  const selectedCount = $('#selectedCount');
  const statusText = $('#statusText');
  const downloadBtn = $('#downloadBtn');
  const progressWrap = $('#progressWrap');
  const progressBar = $('#progressBar');
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');

  let payload = null;
  let images = [];
  let selected = new Set();
  let busy = false;

  function setStatus(text, type = '') {
    statusText.textContent = text;
    statusText.className = 'status' + (type ? ' ' + type : '');
  }

  function setBusy(value) {
    busy = value;
    downloadBtn.disabled = value || selected.size === 0;
    ['selectAll', 'invert', 'clearSel'].forEach(id => { $('#' + id).disabled = value; });
  }

  function updateSelected() {
    selectedCount.textContent = String(selected.size);
    downloadBtn.disabled = busy || selected.size === 0;
    document.querySelectorAll('.card').forEach(card => {
      const index = Number(card.dataset.index);
      const checked = selected.has(index);
      card.classList.toggle('selected', checked);
      const input = card.querySelector('input[type="checkbox"]');
      if (input) input.checked = checked;
    });
  }

  function render() {
    totalCount.textContent = String(images.length);
    grid.innerHTML = '';

    if (!images.length) {
      empty.hidden = false;
      grid.hidden = true;
      setStatus('没有提取到图片');
      setBusy(false);
      updateSelected();
      return;
    }

    empty.hidden = true;
    grid.hidden = false;

    images.forEach((url, index) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.index = String(index);
      card.innerHTML = `
        <label class="checkbox" title="选择这张图片">
          <input type="checkbox" data-index="${index}">
        </label>
        <span class="index">${String(index + 1).padStart(3, '0')}</span>
        <div class="thumb"><img loading="lazy" src="${escapeAttr(url)}" alt="商品图片 ${index + 1}"></div>
        <div class="meta">
          <span class="size">读取尺寸...</span>
          <a class="open" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">查看原图</a>
        </div>
      `;

      const img = card.querySelector('img');
      const size = card.querySelector('.size');
      img.addEventListener('load', () => {
        if (img.naturalWidth && img.naturalHeight) {
          size.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        } else {
          size.textContent = '尺寸未知';
        }
      });
      img.addEventListener('error', () => {
        card.classList.add('broken');
        size.textContent = '加载失败';
      });

      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(index);
        else selected.delete(index);
        updateSelected();
      });
      checkbox.addEventListener('click', (event) => event.stopPropagation());

      card.addEventListener('click', (event) => {
        if (event.target.closest('a') || event.target.closest('label')) return;
        openLightbox(url);
      });

      card.querySelector('.open').addEventListener('click', (event) => event.stopPropagation());

      grid.appendChild(card);
    });

    setStatus(`已读取 ${images.length} 张图片，请勾选需要下载的图片`);
    setBusy(false);
    updateSelected();
  }

  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function openLightbox(url) {
    lightboxImg.src = url;
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
  }

  // ---------- 下载 ----------
  async function toPng(url) {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('不是图片资源');
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0);
    if (bitmap.close) bitmap.close();
    return await new Promise((resolve, reject) => {
      canvas.toBlob(png => {
        if (png) resolve(png);
        else reject(new Error('PNG 转换失败'));
      }, 'image/png');
    });
  }

  function downloadBlob(blob, filename) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
        const error = chrome.runtime.lastError;
        setTimeout(() => URL.revokeObjectURL(url), 8000);
        if (error || !downloadId) {
          reject(new Error(error?.message || '下载失败'));
          return;
        }
        resolve(downloadId);
      });
    });
  }

  async function downloadSelected() {
    if (busy || !selected.size) return;
    const list = Array.from(selected).sort((a, b) => a - b);
    const files = [];
    const failed = [];

    setBusy(true);
    progressWrap.hidden = false;
    progressBar.style.width = '2%';

    for (let i = 0; i < list.length; i++) {
      const index = list[i];
      setStatus(`正在转换 ${i + 1}/${list.length}...`);
      progressBar.style.width = `${Math.round(((i + 1) / list.length) * 100)}%`;
      try {
        const png = await toPng(images[index]);
        const data = new Uint8Array(await png.arrayBuffer());
        files.push({
          name: `imagegrab_${String(index + 1).padStart(3, '0')}.png`,
          data
        });
      } catch (error) {
        failed.push({ index, reason: error.message || '转换失败' });
      }
    }

    try {
      if (!files.length) {
        setStatus('所选图片转换失败，请尝试「查看原图」后手动保存', 'error');
        return;
      }

      if (files.length === 1) {
        await downloadBlob(new Blob([files[0].data], { type: 'image/png' }), files[0].name);
        setStatus('已下载 1 张 PNG 图片', '');
      } else {
        const zip = createImageGrabZip(files);
        await downloadBlob(zip, 'imagegrab_images.zip');
        setStatus(`已打包下载 ${files.length} 张 PNG 图片（ZIP）`, '');
      }

      if (failed.length) {
        setStatus(`完成，${failed.length} 张转换失败：第 ${failed.map(f => f.index + 1).join('、')} 张`, 'warn');
      }
    } catch (error) {
      setStatus('下载失败：' + (error.message || '请检查下载权限'), 'error');
    } finally {
      setBusy(false);
      setTimeout(() => { progressWrap.hidden = true; }, 800);
    }
  }

  // ---------- 事件 ----------
  downloadBtn.addEventListener('click', downloadSelected);

  $('#selectAll').addEventListener('click', () => {
    if (busy) return;
    selected = new Set(images.map((_, index) => index));
    updateSelected();
  });

  $('#invert').addEventListener('click', () => {
    if (busy) return;
    const next = new Set();
    images.forEach((_, index) => {
      if (!selected.has(index)) next.add(index);
    });
    selected = next;
    updateSelected();
  });

  $('#clearSel').addEventListener('click', () => {
    if (busy) return;
    selected.clear();
    updateSelected();
  });

  $('#closeBtn').addEventListener('click', () => {
    window.close();
    setTimeout(() => history.back(), 120);
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target.id === 'lightboxClose') closeLightbox();
  });
  lightboxImg.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  // ---------- 初始化 ----------
  store.get('imagegrab_payload', (data) => {
    payload = data.imagegrab_payload || null;
    if (!payload || !Array.isArray(payload.images)) {
      images = [];
      pageTitle.textContent = '图片画廊';
      pageUrl.textContent = '还没有提取结果';
      sourceLink.textContent = '商品详情页';
      sourceLink.removeAttribute('href');
      render();
      return;
    }

    images = payload.images.filter(url => typeof url === 'string' && url);
    pageTitle.textContent = payload.pageTitle || '图片画廊';
    pageUrl.textContent = '来源：商品详情页 · 图片仅在本机处理';
    if (payload.pageUrl) {
      sourceLink.href = payload.pageUrl;
      sourceLink.title = payload.pageUrl;
      sourceLink.textContent = payload.pageTitle || '商品详情页';
    }
    document.title = `${payload.pageTitle || '图片画廊'} · 图提取`;
    render();
  });
})();
