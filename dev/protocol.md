# Agent 协议

Agent 与面板之间是 WebSocket + JSON，定义在 `crates/pulse-proto`，两边共用同一份源码。

## 连接

```
wss://panel.example.com/api/v1/agent/ws
Authorization: Bearer <TOKEN>
Sec-WebSocket-Protocol: pulse.v1
```

token 在数据库里只存 SHA-256。认不出来就是 401， Agent 会按指数退避重连（最长 5 分钟）。

## 消息

### Agent → 面板

| 类型 | 时机 | 内容 |
|---|---|---|
| `hello` | 连上之后第一条 | 主机名、系统、内核、架构、 CPU 型号、核数、内存/硬盘总量、 Agent 版本、**能力声明** |
| `metrics` | 每 `interval` 秒 | CPU、内存、硬盘、网速、连接数、进程数、温度、 GPU |
| `ping` | 探测完成时 | 每个探测点的 RTT 与丢包计数 |

### 面板 → Agent

| 类型 | 时机 | 内容 |
|---|---|---|
| `welcome` | 认证通过 | 服务器时间、上报间隔 |
| `config` | 认证后 + 后台改配置时 | 上报间隔、网卡过滤、 GPU 开关、延迟探测任务 |

::: danger 没有「执行」这类消息
这是设计约束，不是还没做。Server 暴露在公网上，它被攻陷的概率远高于你的每一台 VPS；
如果 Agent 接受面板下发的命令，攻陷面板就等于攻陷所有机器。

`tools/check-agent-hardening.sh` 会在 CI 里断言这一点。
:::

## 能力声明

`hello` 里带一份 `capabilities`，说明这台机器**采得到什么**：

```json
{
  "load_average": true,
  "temperature": false,
  "tcp_conn_count": true,
  "proc_count": true,
  "icmp_unprivileged": true,
  "gpu_nvml": false,
  "self_update": true,
  "cgroup_limited": false
}
```

Server 据此决定显示什么。**采不到的整块隐藏，不显示 0** —— 一个写着「温度 0°C」的面板
比没有这一项更糟，它让你以为自己知道。

## 向后兼容

Server 会先于 Agent 升级，所以**老 Agent 必须能继续上报**。

- 新增字段一律可选，反序列化时给默认值
- 不认识的消息类型丢弃并记一条日志，不断连接
- `pulse-proto` 里有一组「老消息仍能解析」的测试专门盯这件事

改协议时如果这组测试红了，说明改动会让线上的老 Agent 掉线 —— 那就得换个改法。

## 断线

Agent 断线后按指数退避重连，**不补报**断线期间的数据。

`AgentMsg` 里只有 `Hello`、`Metrics`（单条采样）、`PingResults`，
没有承载多条历史采样的消息 —— 那段时间在图上就是一个空缺。

这是有意的：补一段来历不明的数据，比留一个诚实的空缺更糟。
空缺本身也是信息（这台机器当时联系不上）。

延迟探测结果确实会攒着批量发（默认 30 秒一批），但那是**会话内的批处理**，
不是断线补报 —— 会话一断，没发出去的那批就丢了。
