# 图提取 ImageGrab

一个基于 Chrome Manifest V3 的电商图片提取下载插件：在淘宝、天猫、京东、拼多多商家版商品详情页一键提取页面图片，在新标签页集中预览、勾选，支持单张 PNG 下载与多张 ZIP 打包下载。

## 功能

- **一键提取**：自动扫描 `img`、`srcset`、`data-src`、`data-original`、背景图等来源，兼容懒加载；
- **智能过滤**：排除图标、Logo、占位图、1×1 像素图与小于 100×100 的图片；
- **集中预览**：新标签页网格展示缩略图、尺寸、原图链接，支持放大预览；
- **自由勾选**：全选 / 反选 / 按需勾选；
- **统一 PNG**：通过 `fetch + createImageBitmap + canvas` 把 JPG / WebP 转为 PNG；
- **批量下载**：单张直接下载，多张自动打包为 ZIP，文件名按序号补零；
- **本地处理**：不依赖后端，图片只在浏览器本地处理。

## 目录结构

```
10.26/
├── imagegrab/          # Chrome 扩展源码
│   ├── manifest.json
│   ├── content.js / content.css
│   ├── background.js
│   ├── gallery.html / gallery.js / gallery.css
│   ├── zip.js
│   ├── popup.html / popup.js
│   └── icons/
├── docs/               # 静态官网（可部署到 GitHub Pages）
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── assets/imagegrab.zip
├── mock/               # 本地演示商品页（用于测试插件）
└── README.md
```

## 本地安装插件

1. 下载 `docs/assets/imagegrab.zip` 并解压；
2. 打开 Chrome / Edge，地址栏输入 `chrome://extensions`；
3. 打开右上角「开发者模式」；
4. 点击「加载已解压的扩展程序」，选择解压后的文件夹。

## 本地测试

在项目根目录启动一个静态服务器：

```powershell
python -m http.server 8000
```

访问 `http://localhost:8000/mock/product.html?id=123456`。由于测试构建的 `manifest.json` 额外允许了 `localhost:8000`，插件会在页面右下角注入「获取图片」按钮。正式版本只匹配淘宝 / 天猫 / 京东 / 拼多多商家版。

## 官网预览

直接在浏览器打开 `docs/index.html`，或在本地服务器访问：

```
http://localhost:8000/docs/index.html
```

## 部署

1. 把仓库推送到 GitHub；
2. 仓库 **Settings → Pages**，Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/docs`；
3. 等待 1~2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`。

- 仓库地址：<https://github.com/yuchengwen393/imagegrab>
- 部署域名：<https://yuchengwen393.github.io/imagegrab/>

## 技术说明

- Manifest V3 + Service Worker；
- `chrome.storage.session` 传递提取结果；
- `chrome.downloads` 保存 PNG / ZIP；
- 纯前端 ZIP 打包（store 模式），无第三方依赖；
- 官网为纯静态 HTML / CSS / 原生 JS，无构建工具、无 CDN 依赖。
