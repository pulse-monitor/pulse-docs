# 通知

支持 Telegram、企业微信、Webhook、邮件。可以按分组或单机设阈值。

## 事件

| 事件 | 触发条件 |
|---|---|
| 机器离线 | 超过 `上报间隔 × 3 + 10 秒` 没收到数据 |
| 机器恢复 | 离线后重新连上 |
| CPU 过高 | 持续超过阈值 |
| 内存过高 | 同上 |
| 硬盘过高 | 同上 |
| 流量超额 | 本周期用量超过配额的设定比例 |
| 延迟过高 | 探测点 RTT 超过阈值 |
| 丢包过高 | 探测点丢包率超过阈值 |
| 即将到期 | 剩余天数低于设定值 |

阈值可以设在三个层级：全局默认 → 分组 → 单机，**越具体越优先**。

## 渠道

### Telegram

需要 Bot Token 和 Chat ID。给 [@BotFather](https://t.me/BotFather) 发 `/newbot` 拿 token，
把 bot 拉进群或私聊后从 `getUpdates` 里取 chat id。

### 企业微信

用群机器人的 Webhook 地址即可，不需要企业应用。

### Webhook

POST 一个 JSON 过去，字段包括机器名、事件类型、当前值、阈值、时间。
**公网地址必须是 HTTPS**（内网地址不限）。

### 邮件

标准 SMTP。密码在数据库里加密存储，接口返回时永远打码。

## 模板

标题和正文都可以自定义，用 `{{ }}` 取值：

```
{{ server.name }} · {{ event.label }}
```

```
机器：{{ server.name }}{% if server.country %} ({{ server.country }}){% endif %}
事件：{{ event.label }}
当前：{{ event.value }}{% if event.threshold %}（阈值 {{ event.threshold }}）{% endif %}
时间：{{ time }}{% if panel_url %}
面板：{{ panel_url }}{% endif %}
```

**没有值的字段整块省略**，不会渲染出「（阈值 ）」这种空壳。

模板写错了不会导致通知发不出去 —— 渲染失败时退回默认模板，并在日志里说明。
通知的意义是送达，不是排版。

## 静默

- 每个事件有冷却时间，避免抖动时刷屏
- 可以设静默时段（比如夜间不发）
- 机器手动隐藏后不再产生通知
