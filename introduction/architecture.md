# 系统架构

```text
                         Pulse
                           │
              ┌────────────┴────────────┐
              │                         │
        Pulse Server               Pulse Web
              │
          WebSocket / WSS
              │
      ┌───────┼───────┐
      │       │       │
    Agent   Agent   Agent
```

三个组件，各自独立发版。

## Pulse Server

单个静态二进制，负责：

- Agent 连接与身份认证
- 遥测数据接收与存储
- HTTP API
- 告警判定与通知投递
- 提供 Web 静态文件（`PULSE_WEB_DIR`）

**连接方向是 Agent → Server**， Server 从不主动连 Agent。这意味着 Agent 所在的
机器不需要有公网 IP，也不需要开任何入站端口。

## Pulse Agent

装在被监控的机器上，采集系统与网络指标，通过 WebSocket 上报。

它只做两件事：**Collect and report.**

## Pulse Web

React 单页应用，构建产物是一组静态文件，由 Server 提供。它自己不跑服务，
也不直接连数据库 —— 所有数据都走 Server 的 API。

## 数据是怎么流动的

```text
Agent 采样 ──WSS──> Server 内存环形缓冲 ──每分钟──> SQLite 原始层
                          │                              │
                          │                         定时上卷
                          ▼                              ▼
                    Web 实时视图                  分钟 / 小时 / 天层
```

- **实时视图**读的是内存里的环形缓冲，不查库；
- **历史图表**读库，按请求的时间跨度自动选择合适的层，
  所以「最近 1 小时」和「最近 1 年」返回的点数是同一个量级。

## 存储

目前只有 **SQLite** 一个实现。存储层抽象成了 `Storage` trait，
将来接别的后端时不必动上层，但在真写出第二个实现之前，别指望 `postgres://` 能用。

SQLite 用 WAL 模式，读写连接池分开。写只有批量接口，没有单行写 ——
单行独立事务是 SQLite 慢的根源。

## 仓库划分

| 仓库 | 内容 |
|---|---|
| [pulse](https://github.com/pulse-monitor/pulse) | Server + 协议定义（`pulse-proto`） |
| [pulse-web](https://github.com/pulse-monitor/pulse-web) | Web 前端 |
| [pulse-agent](https://github.com/pulse-monitor/pulse-agent) | Agent |
| [pulse-docs](https://github.com/pulse-monitor/pulse-docs) | 这份文档 |

协议放在 Server 仓库 —— 它是 Server 与 Agent 之间的契约，由 Server 那边定版，
Agent 按 tag 引用。开发相关的细节见[开发架构](/dev/architecture)。
