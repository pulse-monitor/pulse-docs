# Pulse 文档

[Pulse](https://github.com/pulse-monitor/pulse) 的官方文档。

**在线阅读：<https://pulse-doc.pages.dev/>**

VitePress 构建，部署在 Cloudflare Pages，推到 `main` 自动发布。

## 本地开发

```bash
npm install
npm run docs:dev       # 起本地预览
npm run docs:build     # 构建到 .vitepress/dist
npm run docs:preview   # 预览构建产物
```

## 写作约定

见 [REFERENCE.md](REFERENCE.md)。核心几条：

- 产品定位是**基础设施可视化平台**，不是「VPS 监控面板」
- 正式术语用 **Agent** / **Server** / **遥测数据**
- 核心表达：**一眼，看见你的基础设施。** / **看见，而不是控制。**
- 语气克制、技术化，不用「全能」「终极」「一站式」这类词

还有一条硬要求：**文档里的命令、参数名、默认值必须与当前源码一致**。
写之前去仓库里核一遍，不要照抄旧版本或凭印象写。

## 相关仓库

| 仓库 | 内容 |
|---|---|
| [pulse](https://github.com/pulse-monitor/pulse) | Server + 协议定义 |
| [pulse-web](https://github.com/pulse-monitor/pulse-web) | Web 前端 |
| [pulse-agent](https://github.com/pulse-monitor/pulse-agent) | Agent |

## 许可

[MIT](LICENSE)
