# Pulse 文档

📖 **在线阅读：<https://pulse-docs.pages.dev/>**

这是 [Pulse](https://github.com/pulse-monitor/pulse) 的文档源码。日常查阅请直接看在线站点。

---

## 本地预览

```bash
npm install
npm run docs:dev      # 热更新预览，改完立刻能看到
npm run docs:build    # 构建到 .vitepress/dist
npm run docs:preview  # 预览构建产物
```

## 目录

```
index.md          首页
install/          安装与配置
faq/              使用与常见问题
dev/              开发指南、协议
.vitepress/       配置（导航栏、侧边栏）
```

加页面要同时在 `.vitepress/config.mts` 的 `zhSidebar` 里登记，否则侧边栏看不到它。

## 部署

`base` 现在是 `'/'`，适用于部署在**域名根路径**下（Cloudflare Pages 的 `*.pages.dev`、
或自定义域名）。

### Cloudflare Pages

在控制台新建项目连上这个仓库：

| 项 | 值 |
|---|---|
| 构建命令 | `npm run docs:build` |
| 输出目录 | `.vitepress/dist` |
| Node 版本 | `22` |

### GitHub Pages

仓库里有现成的 workflow（`.github/workflows/deploy.yml`），
在 **Settings → Pages → Source** 选 **GitHub Actions** 即可。

::: warning
GitHub Pages 默认部署在 `<用户名>.github.io/<仓库名>/` 下，是个子路径。
这种情况要把 `.vitepress/config.mts` 里的 `base` 改成 `'/pulse-docs/'`，
否则 CSS 和 JS 的路径少一层前缀，整站白屏。
:::

## 许可

文档与代码同为 MIT。
