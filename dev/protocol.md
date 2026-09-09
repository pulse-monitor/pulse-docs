# 协议

探针与面板之间是 WebSocket + JSON，定义在 `crates/pulse-proto`，两边共用同一份源码。

## 连接

```
wss://panel.example.com/api/v1/agent/ws
Authorization: Bearer <TOKEN>
Sec-WebSocket-Protocol: pulse.v1
```

token 在数据库里只存 SHA-256。认不出来就是 401，探针会按指数退避重连（最长 5 分钟）。

## 消息

### 探针 → 面板

| 类型 | 时机 | 内容 |
|---|---|---|
| `hello` | 连上之后第一条 | 主机名、系统、内核、架构、CPU 型号、核数、内存/硬盘总量、探针版本、**能力声明** |
| `metrics` | 每 `interval` 秒 | CPU、内存、硬盘、网速、连接数、进程数、温度、GPU |
| `ping` | 探测完成时 | 每个探测点的 RTT 与丢包计数 |

### 面板 → 探针

| 类型 | 时机 | 内容 |
|---|---|---|
| `welcome` | 认证通过 | 服务器时间、上报间隔 |
| `config` | 认证后 + 后台改配置时 | 上报间隔、网卡过滤、GPU 开关、延迟探测任务 |

::: danger 没有「执行」这类消息
这是设计约束，不是还没做。面板暴露在公网上，它被攻陷的概率远高于你的每一台 VPS；
如果探针接受面板下发的命令，攻陷面板就等于攻陷所有机器。

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

面板据此决定显示什么。**采不到的整块隐藏，不显示 0** —— 一个写着「温度 0°C」的面板
比没有这一项更糟，它让你以为自己知道。

## 向后兼容

面板会先于探针升级，所以**老探针必须能继续上报**。

- 新增字段一律可选，反序列化时给默认值
- 不认识的消息类型丢弃并记一条日志，不断连接
- `pulse-proto` 里有一组「老消息仍能解析」的测试专门盯这件事

改协议时如果这组测试红了，说明改动会让线上的老探针掉线 —— 那就得换个改法。

## 补报

探针断线期间会缓存最多 5 分钟的指标，重连后一次补上。

面板按时间戳去重，重复补报是幂等的（落盘用 upsert）。
