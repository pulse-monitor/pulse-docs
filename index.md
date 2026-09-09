---
layout: home

hero:
  name: Pulse
  text: 看住你所有的小鸡
  tagline: 装上就能用的 VPS 监控面板。谁掉线了、流量跑了多少、哪台快到期了 —— 一页看完。
  actions:
    - theme: brand
      text: 快速开始
      link: /install/quick-start
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/pulse-monitor/pulse

features:
  - icon: 🪶
    title: 轻
    details: 探针 2.3 MB、常驻内存 4 MB。面板是单个二进制加 SQLite，不用装数据库。
  - icon: 🔒
    title: 不接受远程指令
    details: 探针只上报、不听命。面板被攻陷也动不了你的机器。
  - icon: 💰
    title: 账单与到期
    details: 记价格和周期，快到期了提醒你，还能算出这批机器还剩多少钱没用完。
  - icon: 📊
    title: 流量统计
    details: 按计费周期算，超配额告警。探针重启、机器重装都不会丢数。
  - icon: 🌍
    title: 地理分布
    details: 机器在哪个国家自动认出来，地球上整块点亮。GeoIP 库在本地，IP 不外传。
  - icon: 🔔
    title: 通知
    details: Telegram、企业微信、Webhook、邮件。阈值可以按分组或单机单独设。
  - icon: 📡
    title: 延迟监测
    details: 多个探测点画在同一张图上，一眼看出哪条线路慢了。
  - icon: 🖥️
    title: 三平台
    details: Linux、Windows、macOS。Linux 上静态链接，不挑发行版。
---
