# 安全概览

Pulse 的安全模型建立在一句话上：

> **Visibility should not become control.**
>
> 看见，而不是控制。

## 三条边界

| | |
|---|---|
| **Agent 不接受远程指令** | 协议里没有「执行」这类消息， CI 有断言盯着 → [Agent 安全](/security/agent) |
| **凭据不以可逆形式存储** | token 只存 SHA-256，密码用 Argon2 → [身份认证](/security/authentication) |
| **数据不出你的基础设施** | GeoIP 库在本地， IP 不外传 → [隐私](/security/privacy) |

## 为什么这么设计

Server 是暴露在公网上的 Web 服务，它被攻陷的概率**远高于**你的每一台机器。

如果 Agent 听命于 Server，那么攻陷 Server = 攻陷所有机器。监控系统会从
「看见问题的工具」变成「问题本身」。

所以 Pulse 把这件事从协议层就排除掉了 —— 不是「默认关闭」，是**根本没有实现**。

## 可以自己验证

这些都不是承诺，是可以跑一遍的：

```bash
# Agent 源码里有没有执行外部命令、监听端口的路径
sh tools/check-agent-hardening.sh      # pulse-agent 仓库

# 装好的 Agent 实际是什么权限
ps -o user= -p $(pgrep pulse-agent)    # 应该是 pulse，不是 root
getpcaps $(pgrep pulse-agent)          # 应该是空
ss -lntp | grep pulse-agent            # 应该什么都没有
systemd-analyze security pulse-agent   # 评分约 2.0（OK）
```

## 采不到就说采不到

非 root 采不到的东西**如实标记为不可用**，整块不显示，不用 0 填充。

一个写着「温度 0°C」「进程数 0」的面板比没有这一项更糟 ——
它让你以为自己知道，其实不知道。
