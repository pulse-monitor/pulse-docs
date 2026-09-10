# 快速开始

装一个Server + 一个 Agent，大约五分钟。

## 1. 起 Server

Server 是**单个静态二进制**，不需要数据库、不需要运行时。

```bash
curl -fsSL https://github.com/pulse-monitor/pulse/releases/latest/download/pulse-server-x86_64-unknown-linux-musl \
  -o pulse-server && chmod +x pulse-server

PULSE_BIND=0.0.0.0:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
./pulse-server
```

Server 还需要前端的静态文件，从 [pulse-web 的 Release](https://github.com/pulse-monitor/pulse-web/releases/latest)
下一份，用 `PULSE_WEB_DIR` 指过去：

```bash
curl -fsSL https://github.com/pulse-monitor/pulse-web/releases/latest/download/pulse-web-dist.tar.gz \
  | tar xz
PULSE_WEB_DIR=./dist ./pulse-server
```

::: tip 装完立刻去设置管理员
面板起来后打开它，**第一个访问的人设定自己的用户名和密码**。安装时不带密码参数，
也不用去日志里翻。

代价说清楚：在你设置完成之前，任何能打开这个地址的人都可以抢先创建管理员。
所以装完请**立刻**去设置。无人值守部署不能接受这个窗口的话，用
`PULSE_ADMIN_PASSWORD`（可配 `PULSE_ADMIN_USERNAME`）预先建好，
那样初始化接口从一开始就是关的。
:::

`PULSE_PUBLIC_URL` 是Server 的对外地址，**生成安装命令时会写进去**。装在别的机器上时必须设对，
否则 Agent 连不上。

### 用 Docker

```yaml
services:
  pulse:
    image: ghcr.io/pulse-monitor/pulse:latest
    restart: unless-stopped
    ports: ["25774:25774"]
    volumes: ["./data:/data"]
    environment:
      PULSE_BIND: 0.0.0.0:25774
      PULSE_DATA_DIR: /data
      PULSE_DATABASE_URL: sqlite:///data/pulse.db
      PULSE_PUBLIC_URL: https://panel.example.com
```

### 做成系统服务

```ini
# /etc/systemd/system/pulse-server.service
[Unit]
Description=Pulse Server
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/pulse
Environment=PULSE_BIND=0.0.0.0:25774
Environment=PULSE_DATA_DIR=/opt/pulse/data
Environment=PULSE_DATABASE_URL=sqlite:///opt/pulse/data/pulse.db
Environment=PULSE_PUBLIC_URL=https://panel.example.com
Environment=PULSE_WEB_DIR=/opt/pulse/web/dist
ExecStart=/opt/pulse/pulse-server
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now pulse-server
```

## 2. 一定要走 HTTPS

> **Agent 的 token 放在 WebSocket 握手头里。** 走明文 `ws://` 的话，链路上任何一跳都能拿到它 ——
> 拿到就能冒充这台机器上报数据。

Server 启动时会检查这一点，`PULSE_PUBLIC_URL` 是公网明文地址就打一条 WARN。两条路选一条：

### 甲：Server 自己跑 HTTPS

```bash
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TLS_CERT=/etc/pulse/tls/fullchain.pem \
PULSE_TLS_KEY=/etc/pulse/tls/privkey.pem \
./pulse-server
```

- 两个变量**必须同时给**，只给一个会直接启动失败 —— 「以为开了 TLS 其实没开」比起不来危险得多
- 证书用 certbot / acme.sh 签好即可
- **续期后要重启 Server**才会加载新证书

### 乙：放在 nginx / Caddy 后面

```bash
PULSE_BIND=127.0.0.1:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TRUSTED_PROXY_HOPS=1 \
./pulse-server
```

- **`PULSE_TRUSTED_PROXY_HOPS` 不设的话，登录限流和访客标签看到的都是反代的 IP**
- Agent 连的是 WebSocket，代理必须放行 `Upgrade` / `Connection` 头。 Caddy 默认就行；
  nginx 要写 `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`
- WebSocket 是长连接，`proxy_read_timeout` 要调大（比如 `3600s`），否则 Agent 每分钟被踢一次

## 3. 加机器、装 Agent

后台 → 服务器 → 填个名字 → 添加，然后点「安装命令」。

> **点「生成安装命令」会换掉这台机器的 token。** 数据库里只存哈希、取不回明文，
> 所以每次生成都是一把新钥匙。已经装了 Agent 的机器会掉线，直到用新命令重装。

把生成的命令贴到目标机器上：

```bash
curl -fsSL https://panel.example.com/install.sh | sudo bash -s -- \
  --server wss://panel.example.com \
  --token <TOKEN>
```

安装需要 sudo （写 systemd unit、建专用用户），但**装完之后 Agent 是以非特权用户 `pulse` 运行的**。

装完检查一下：

```bash
systemctl status pulse-agent          # 应该是 active
ss -lntp | grep pulse                 # 应该没有输出 —— Agent不监听任何端口
systemd-analyze security pulse-agent  # 评分应为 2.0 左右
```

面板上这台机器一两秒内就会变绿。

## 下一步

- [安装选项](/install/agent) —— 安装脚本的全部参数、三平台差异、卸载
- [配置](/install/config) —— 环境变量完整清单
- [流量与账单](/usage/traffic) —— 计费周期、配额、到期提醒
- [通知](/usage/notify) —— Telegram / 企业微信 / Webhook / 邮件
