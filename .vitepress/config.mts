import { defineConfig } from 'vitepress'

const REPO = 'https://github.com/pulse-monitor/pulse'

const zhNav = [
  { text: '主页', link: '/' },
  { text: '介绍', link: '/introduction/what-is-pulse' },
  { text: '开始使用', link: '/install/quick-start' },
  { text: '使用指南', link: '/usage/dashboard' },
  { text: '安全', link: '/security/' },
  { text: '开发', link: '/dev/build' },
]

const zhSidebar = [
  {
    text: '介绍',
    items: [
      { text: 'Pulse 是什么？', link: '/introduction/what-is-pulse' },
      { text: '系统架构', link: '/introduction/architecture' },
    ],
  },
  {
    text: '开始使用',
    items: [
      { text: '快速开始', link: '/install/quick-start' },
      { text: 'Server 部署', link: '/install/server' },
      { text: 'Docker 部署', link: '/install/docker' },
      { text: 'Agent 安装选项', link: '/install/agent' },
      { text: '配置', link: '/install/config' },
    ],
  },
  {
    text: '使用指南',
    items: [
      { text: 'Dashboard', link: '/usage/dashboard' },
      { text: '服务器管理', link: '/usage/servers' },
      { text: '流量', link: '/usage/traffic' },
      { text: '成本与到期', link: '/usage/billing' },
      { text: '网络延迟', link: '/usage/latency' },
      { text: '通知', link: '/usage/notify' },
    ],
  },
  {
    text: '安全',
    items: [
      { text: '安全概览', link: '/security/' },
      { text: 'Agent 安全', link: '/security/agent' },
      { text: '身份认证', link: '/security/authentication' },
      { text: '隐私', link: '/security/privacy' },
    ],
  },
  {
    text: '故障排查',
    items: [{ text: '常见问题', link: '/troubleshooting/' }],
  },
  {
    text: '开发',
    items: [
      { text: '从源码构建', link: '/dev/build' },
      { text: '开发架构', link: '/dev/architecture' },
      { text: 'Agent 协议', link: '/dev/protocol' },
    ],
  },
]

export default defineConfig({
  title: 'Pulse',
  description: '轻量、自托管的基础设施可视化平台。一眼，看见你的基础设施。',
  lang: 'zh-CN',
  // 部署在子路径下时所有资源都要带前缀，不一致的话 CSS/JS 全部 404、
  // 整站变成裸 HTML。**这个值来回改错过两次**，所以改成由环境变量决定，
  // 不再靠人记：
  //
  //   Cloudflare Pages（pulse-doc.pages.dev）/ 自定义域名 → 根路径，默认值
  //   GitHub Pages（<user>.github.io/<repo>/）→ 在 workflow 里设
  //                                             DOCS_BASE=/pulse-docs/
  base: process.env.DOCS_BASE || '/',
  // 仓库自己的说明文件不该变成站点页面：README 是给来看代码的人的，
  // REFERENCE 是写作规范。不排除的话它们会被当成文档页构建，
  // 里面指向仓库文件的相对链接（比如 LICENSE）还会被判成死链。
  srcExclude: ['README.md', 'REFERENCE.md'],
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${process.env.DOCS_BASE || '/'}favicon.svg` }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    nav: zhNav,
    sidebar: zhSidebar,
    socialLinks: [{ icon: 'github', link: REPO }],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/pulse-monitor/pulse-docs/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    outline: { level: [2, 3], label: '本页目录' },
    lastUpdatedText: '最后更新',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    footer: {
      message: '基于 MIT 许可发布',
      copyright: `<a href="${REPO}">Pulse</a>`,
    },
  },
})
