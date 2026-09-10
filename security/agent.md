# Agent 安全

Agent 遵循最小权限原则。

## 权限边界

| | |
|---|---|
| 运行身份 | **非 root**（Linux 上是专用用户 `pulse`） |
| Capabilities | **空** —— `getpcaps` 输出什么都没有 |
| 监听端口 | **零** —— `ss -lntp` 里找不到它 |
| 远程执行 | **不支持，也不打算支持** |
| systemd 加固 | `systemd-analyze security` 评分约 2.0 （OK） |

安装需要 sudo （写 systemd unit、建用户），**但这是一次性的**。
长期暴露的攻击面是非特权的。

## 连接方向

**Agent 主动连 Server**， Server 从不主动连 Agent。

所以被监控的机器不需要公网 IP，也不需要开任何入站端口。
防火墙上不用为 Pulse 放行任何东西。

## Agent 不做什么

- 远程 Shell
- 远程命令执行
- 远程文件读写
- 远程进程管理
- 任何入站监听端口

它接受来自 Server 的只有**运行期配置**（采样间隔、上报哪些指标、网卡过滤规则），
且全部经过白名单校验和范围钳制 —— Server 下发一个荒谬的值不会让 Agent 出问题。

## 这些是机器验证的

[tools/check-agent-hardening.sh](https://github.com/pulse-monitor/pulse-agent/blob/main/tools/check-agent-hardening.sh)
在 CI 里每次都跑，逐条断言源码里：

- 没有 `process::Command`
- 没有 `TcpListener` / `UnixListener`
- `process::exit` 只出现在更新模块
- 不读 `product_serial` / `product_uuid` 这类机器指纹
- 不读进程命令行（命令行里常含密码）
- 每处 `unsafe` 都有 `SAFETY` 说明
- Server 下发的配置经过 sanitize
- token 只从环境变量读，不接受命令行参数

::: tip 脚本自己也会失败
这个脚本每条检查都是「grep 不到东西 = 通过」，所以它自带一个守卫：
源码目录不存在时直接 `exit 2`，而不是报一片绿。

拆分仓库时正好踩到过 —— 路径没跟着改，输出全是 ✔，其实什么都没查。
:::

## 自更新的 5 道防线

1. **下载源只从本地配置读** —— Server 影响不了它
2. **minisign 签名校验** —— 公钥**编译期内置**在二进制里
3. **SHA-256 摘要比对**
4. **拒绝降级** —— 版本号必须更高
5. **试用期回滚** —— 新版本要在限定时间内成功连上并上报，否则自动回退

换公钥必须重新编译并重装 Agent —— 这是第 2 道防线成立的前提。

没有内置公钥时自更新整个关闭， Agent 如实上报 `capabilities.self_update: false`。

## 采集权限

Linux 上全部指标都能在非特权用户下采到。想在自己机器上核实一遍：

```bash
sh tools/check-linux-caps.sh
```

需要特权才能拿到的东西， Pulse **选择不拿**：

| | 为什么不做 |
|---|---|
| Windows / macOS 温度 | 要 WMI + 管理员 / SMC 特权访问 |
| 进程命令行 | 命令行里常含密码 |
| 机器指纹（serial / uuid） | 监控用不着，泄露了却很麻烦 |
