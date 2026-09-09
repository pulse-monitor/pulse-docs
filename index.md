---
layout: home

hero:
  name: Pulse
  text: 轻量级 VPS 监控面板
  tagline: 探针 2.3 MB、内存 4 MB、非 root 运行、不监听端口、不接受远程指令
  image:
    src: /favicon.svg
    alt: Pulse
  actions:
    - theme: brand
      text: 快速开始
      link: /install/quick-start
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/pulse-monitor/pulse

features:
  - title: 真的轻
    details: 探针二进制 2.3 MB、常驻内存 4 MB、80 分钟约 1 秒 CPU 时间。面板是单个静态二进制加 SQLite，不需要数据库和 Redis。
  - title: 不接受远程指令
    details: 探针只上报、不听命。面板即使被攻陷也不能在你的机器上跑命令 —— 协议里根本没有「执行」这类消息，CI 里有断言盯着。
  - title: 非特权运行
    details: 装完之后以专用用户运行，零 capabilities，不监听任何端口，systemd 加固评分 2.0。采不到的指标如实标记为不可用，不显示 0。
  - title: 账单与流量
    details: 价格、周期、到期提醒、剩余价值折算、多币种自动汇率；流量按计费周期统计，支持配额与超额告警。
  - title: 地理分布
    details: 自绘 SVG 地球，有机器的国家整块点亮。GeoIP 数据库在本地离线查询，IP 不出你的机器。
  - title: 通知
    details: Telegram、企业微信、Webhook、邮件。阈值可以按全局、分组、单机三层设置，越具体越优先。
---

## 为什么又造一个轮子

现有方案（komari、哪吒）功能都不错，但对「我就想看看机器还活着吗、流量跑了多少、
什么时候到期」这个需求来说太重了。

| | Pulse | 常见方案 |
|---|---|---|
| 探针二进制 | **2.3 MB** | 15～30 MB |
| 探针内存 | **4 MB** | 30～80 MB |
| 探针权限 | **非 root，零 capabilities，不监听端口** | 常需 root |
| 远程执行 / Web 终端 | **明确不做** | 有 |
| 面板依赖 | 单个二进制 + SQLite | 需要数据库 / Redis |

最后两行是**设计约束**，不是没来得及做：

- **不做远程执行。** 面板暴露在公网上，它被攻陷的概率远高于你的每一台 VPS。
  如果探针听命于面板，攻陷面板就等于攻陷所有机器。
- **单文件部署。** 50～200 台机器的规模下 SQLite 完全够用，省掉一整套数据库运维。

## 数据留多久

分三层，自动上卷和清理，不用管：

| 层 | 粒度 | 保留 |
|---|---|---|
| 内存环形缓冲 | 2 秒 | 最近若干分钟 |
| 分钟表 | 1 分钟 | 7 天 |
| 小时表 | 1 小时 | 13 个月 |

200 台机器跑满一年，数据库约 2 GB。
