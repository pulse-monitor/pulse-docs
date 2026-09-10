# 网络延迟

Pulse 可以从**各台 Agent** 出发去探测同一批目标，把结果画在同一张图上 ——
这样一眼能看出是「某个目标挂了」还是「某条线路不行」。

## 探测方式

| 方式 | 说明 |
|---|---|
| **TCP** | 连指定端口，测握手耗时。最通用 |
| **ICMP** | 传统 ping。见下方的平台差异 |
| **HTTP** | 请求一个 URL，可指定期望的状态码 |

### ICMP 不需要特权，但不是哪都能用

Agent 用的是**非特权 ICMP**（`socket(AF_INET, SOCK_DGRAM, IPPROTO_ICMP)`），
不需要 `CAP_NET_RAW`，所以它和「Agent 以空 capabilities 的非 root 用户运行」
并不冲突。

能不能用取决于平台：

| 平台 | 非特权 ICMP | 条件 |
|---|---|---|
| Linux | 可用 | 内核的 `net.ipv4.ping_group_range` 要覆盖运行用户的 gid |
| macOS | 不可用 | 没有 ping_group_range |
| Windows | 不可用 | 没有对应机制 |

Agent 启动时会实际探测这项能力，通过 `Hello` 的 `capabilities.icmp_unprivileged`
上报。**不可用时自动回落 TCP 探测**，不需要你做什么。

想在自己机器上确认，跑 `sh tools/check-linux-caps.sh`（在
[pulse-agent](https://github.com/pulse-monitor/pulse-agent) 仓库里）。

## 任务参数

| 参数 | 说明 |
|---|---|
| 名称 | 显示用 |
| 目标 | 主机名或 IP； TCP 还要端口 |
| 间隔 | 多久探一次 |
| 包数 | 每次探几个包，用于算丢包率 |
| 超时 | 单次探测的超时 |
| 范围 | 全部机器 / 某个分组 / 指定几台 |

## 结果怎么上报

Agent 把探测结果**攒成批**上报（默认 30 秒一批），而不是每探一次发一条消息 ——
6 个目标 × 200 台就是每分钟 1200 条小消息，那样不划算。

会话断开时，没发出去的那一批会丢。这和指标一样： Pulse 不补报，
图上留一个诚实的空缺。

## 看哪里

- 服务器卡片上有延迟和丢包的缩略图
- 单机详情页有完整的延迟 / 丢包图表
- 丢包率是**百分比**（0 ～ 100），不是比例
