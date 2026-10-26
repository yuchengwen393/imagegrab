/**
 * 图提取 ImageGrab 官网交互
 * - 导航吸顶 / 滚动高亮
 * - 移动端菜单
 * - 进入视口淡入动画
 */
(() => {
  'use strict';

  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.getElementById('navLinks');
  const links = Array.from(document.querySelectorAll('.nav-links a'));
  const sections = ['intro', 'features', 'how', 'install']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function onScroll() {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');

    const scroll = window.scrollY + 140;
    let current = '';
    sections.forEach(section => {
      if (scroll >= section.offsetTop) current = section.id;
    });
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      link.classList.toggle('active', href === '#' + current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', (event) => {
      if (!navLinks.classList.contains('open')) return;
      if (navLinks.contains(event.target) || menuBtn.contains(event.target)) return;
      navLinks.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // 滚动进入视口时淡入
  const revealItems = Array.from(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('in'));
  }

  // GitHub 链接：部署后可在 html 里替换 href，这里保持占位不跳转
  document.querySelectorAll('.github-link').forEach(link => {
    if (!link.getAttribute('href') || link.getAttribute('href') === '#') {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.alert('GitHub 仓库地址将在部署后补充');
      });
    }
  });
})();
