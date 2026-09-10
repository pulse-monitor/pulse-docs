---
layout: home

hero:
  name: Pulse
  text: 一眼，看见你的基础设施
  tagline: 轻量、自托管的基础设施可视化平台。健康、性能、网络、流量、成本 —— 一页看完。
  actions:
    - theme: brand
      text: 开始使用
      link: /install/quick-start
    - theme: alt
      text: Pulse 是什么？
      link: /introduction/what-is-pulse

features:
  - icon: 🖥️
    title: 基础设施
    details: 从一个视图了解所有服务器的健康状态与资源水位。
  - icon: 📡
    title: 网络
    details: 多个探测点的延迟与丢包画在同一张图上，一眼看出是哪条线路。
  - icon: 📊
    title: 流量
    details: 按计费周期统计，超额告警。 Agent 重启、机器重装都不会丢数。
  - icon: 💰
    title: 成本
    details: 记价格与周期，算得出这批机器还剩多少钱没用完，快到期了提醒你。
  - icon: 🔔
    title: 告警
    details: Telegram、企业微信、 Webhook、邮件。阈值可按分组或单机设。
  - icon: 🔒
    title: 看见，而不是控制
    details: Agent 只上报、不听命。 Server 被攻陷也动不了你的机器。
---

## 看见，而不是控制

Pulse 的设计边界很明确：

> **Visibility should not become control.**

Server 是暴露在公网上的 Web 服务，它被攻陷的概率**远高于**你的每一台机器。
如果 Agent 听命于 Server，那么攻陷 Server = 攻陷所有机器。

所以协议里**根本没有「执行」这类消息** —— 不是默认关闭，是没有实现。
CI 里有断言逐条盯着，你也可以自己跑一遍。

## 装起来

```bash
curl -fsSL https://raw.githubusercontent.com/pulse-monitor/pulse/main/deploy/scripts/install-server.sh \
  | sudo bash -s -- --url https://panel.example.com
```

装完打开面板，第一个访问的人设定自己的用户名和密码。
然后在后台添加服务器、复制 Agent 安装命令、贴到目标机器上执行。

[完整步骤 →](/install/quick-start)

## 规模

设计目标是 **50 ～ 200 台**。单个静态二进制 + SQLite，不需要额外的数据库运维。

数据分层上卷（原始 → 分钟 → 小时 → 天），查询按时间跨度自动选层 ——
「最近 1 小时」和「最近 1 年」返回的点数是同一个量级，库也不会随时间线性膨胀。
