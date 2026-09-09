# Pulse 文档站

[Pulse](https://github.com/pulse-monitor/pulse) 的使用文档。VitePress 构建，部署在 GitHub Pages。

线上地址：<https://pulse-monitor.github.io/pulse-docs/>

## 本地预览

```bash
npm install
npm run docs:dev      # 热更新预览
npm run docs:build    # 构建到 .vitepress/dist
npm run docs:preview  # 预览构建产物
```

## 部署

推到 `main` 就会自动构建并发布（见 `.github/workflows/deploy.yml`）。

首次使用要在仓库的 **Settings → Pages → Source** 里选 **GitHub Actions**。

## 换自定义域名

1. 在 `public/` 下放一个 `CNAME` 文件，内容是域名
2. 把 `.vitepress/config.mts` 里的 `base` 改回 `'/'`
   —— 它现在是 `/pulse-docs/`，因为 Pages 默认部署在 `<user>.github.io/<repo>/` 下

## 目录

```
index.md          首页（hero 布局）
install/          安装与配置
faq/              使用与常见问题
dev/              开发指南、协议
.vitepress/       配置（导航、侧边栏）
```

加页面要同时在 `.vitepress/config.mts` 的 `zhSidebar` 里登记，否则侧边栏里看不到。
