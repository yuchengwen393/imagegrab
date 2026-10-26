# 图提取 ImageGrab

一个基于 Chrome Manifest V3 的电商图片提取下载插件：在淘宝、天猫、京东、拼多多商家版商品详情页一键提取页面图片，在新页面集中预览、勾选，支持单张 PNG 下载与多张 ZIP 打包下载。

## 安装

1. 下载 `imagegrab.zip` 并解压到本地文件夹；
2. 打开 Chrome / Edge，地址栏输入 `chrome://extensions`；
3. 打开右上角「开发者模式」；
4. 点击「加载已解压的扩展程序」，选择解压后的文件夹。

## 使用

1. 打开淘宝 / 天猫 / 京东 / 拼多多商家版商品详情页；
2. 点击右下角「获取图片」按钮；
3. 插件会自动打开图片画廊，勾选需要的图片；
4. 点击「下载选中」：单张直接下载 PNG，多张自动打包为 ZIP。

## 文件结构

```
imagegrab/
├── manifest.json       # Manifest V3 配置
├── content.js          # 注入按钮、提取图片
├── content.css         # 悬浮按钮样式
├── background.js       # Service Worker：保存结果、打开画廊
├── gallery.html        # 图片画廊页面
├── gallery.css
├── gallery.js          # 勾选、预览、PNG 转换、下载
├── zip.js              # 极简 ZIP 打包（store 模式）
├── popup.html          # 插件弹出面板
├── popup.js
└── icons/              # 16 / 32 / 48 / 128 图标
```

## 说明

- 图片只在浏览器本地处理，不上传服务器；
- 兼容懒加载属性：`data-src`、`data-lazy-src`、`data-original`、`srcset`、背景图等；
- 自动过滤图标、Logo、占位图、1×1 像素图与小于 100×100 的图片；
- 若某些图片受站点跨域策略限制，转换会失败，可点击卡片上的「查看原图」手动保存。
