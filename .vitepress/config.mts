import { defineConfig } from 'vitepress'

const REPO = 'https://github.com/pulse-monitor/pulse'

const zhNav = [
  { text: '主页', link: '/' },
  { text: '快速开始', link: '/install/quick-start' },
  { text: '开发指南', link: '/dev/build' },
  { text: '常见问题', link: '/faq/' },
]

const zhSidebar = [
  {
    text: '安装',
    items: [
      { text: '快速开始', link: '/install/quick-start' },
      { text: '面板部署', link: '/install/server' },
      { text: 'Docker 部署', link: '/install/docker' },
      { text: '探针安装选项', link: '/install/agent' },
      { text: '配置', link: '/install/config' },
    ],
  },
  {
    text: '使用',
    items: [
      { text: '流量与账单', link: '/faq/traffic' },
      { text: '通知', link: '/faq/notify' },
      { text: '安全与隐私', link: '/faq/security' },
      { text: '常见问题', link: '/faq/' },
    ],
  },
  {
    text: '开发',
    items: [
      { text: '从源码构建', link: '/dev/build' },
      { text: '协议', link: '/dev/protocol' },
    ],
  },
]

export default defineConfig({
  title: 'Pulse',
  description: '轻量级 VPS 监控面板 —— 探针 2.3MB / 4MB 内存，非 root 运行，不接受远程指令',
  lang: 'zh-CN',
  // ⚠️ 这个值必须和实际部署路径一致，否则 CSS/JS 全部 404、整站无样式。
  //
  //   GitHub Pages（<user>.github.io/<repo>/）→ '/pulse-docs/'
  //   Cloudflare Pages（*.pages.dev）或自定义域名 → '/'
  //
  // 踩过：改成 '/' 之后 GitHub Pages 上的站点当场变成裸 HTML。
  base: '/pulse-docs/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/pulse-docs/favicon.svg' }]],

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
