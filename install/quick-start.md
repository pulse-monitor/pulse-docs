# 快速开始

装一个面板 + 一个探针，大约五分钟。

## 1. 起面板

面板是**单个静态二进制**，不需要数据库、不需要运行时。

```bash
curl -fsSL https://github.com/pulse-monitor/pulse/releases/latest/download/pulse-server-x86_64-unknown-linux-musl \
  -o pulse-server && chmod +x pulse-server

PULSE_ADMIN_PASSWORD='换成你自己的密码' \
PULSE_BIND=0.0.0.0:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
./pulse-server
```

首次启动会创建管理员 `admin`。**没设 `PULSE_ADMIN_PASSWORD` 时会随机生成一个并打进日志**，
从日志里取。

`PULSE_PUBLIC_URL` 是面板的对外地址，**生成安装命令时会写进去**。装在别的机器上时必须设对，
否则探针连不上。

### 用 Docker

```yaml
services:
  pulse:
    image: jinqians/pulse-server:latest
    restart: unless-stopped
    ports: ["25774:25774"]
    volumes: ["./data:/data"]
    environment:
      PULSE_BIND: 0.0.0.0:25774
      PULSE_DATA_DIR: /data
      PULSE_DATABASE_URL: sqlite:///data/pulse.db
      PULSE_PUBLIC_URL: https://panel.example.com
      PULSE_ADMIN_PASSWORD: 换成你自己的密码
```

### 做成系统服务

```ini
# /etc/systemd/system/pulse-server.service
[Unit]
Description=Pulse 面板
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

> **探针的 token 放在 WebSocket 握手头里。** 走明文 `ws://` 的话，链路上任何一跳都能拿到它 ——
> 拿到就能冒充这台机器上报数据。

面板启动时会检查这一点，`PULSE_PUBLIC_URL` 是公网明文地址就打一条 WARN。两条路选一条：

### 甲：面板自己跑 HTTPS

```bash
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TLS_CERT=/etc/pulse/tls/fullchain.pem \
PULSE_TLS_KEY=/etc/pulse/tls/privkey.pem \
./pulse-server
```

- 两个变量**必须同时给**，只给一个会直接启动失败 —— 「以为开了 TLS 其实没开」比起不来危险得多
- 证书用 certbot / acme.sh 签好即可
- **续期后要重启面板**才会加载新证书

### 乙：放在 nginx / Caddy 后面

```bash
PULSE_BIND=127.0.0.1:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TRUSTED_PROXY_HOPS=1 \
./pulse-server
```

- **`PULSE_TRUSTED_PROXY_HOPS` 不设的话，登录限流和访客标签看到的都是反代的 IP**
- 探针连的是 WebSocket，代理必须放行 `Upgrade` / `Connection` 头。Caddy 默认就行；
  nginx 要写 `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`
- WebSocket 是长连接，`proxy_read_timeout` 要调大（比如 `3600s`），否则探针每分钟被踢一次

## 3. 加机器、装探针

后台 → 服务器 → 填个名字 → 添加，然后点「安装命令」。

> **点「生成安装命令」会换掉这台机器的 token。** 数据库里只存哈希、取不回明文，
> 所以每次生成都是一把新钥匙。已经装了探针的机器会掉线，直到用新命令重装。

把生成的命令贴到目标机器上：

```bash
curl -fsSL https://panel.example.com/install.sh | sudo bash -s -- \
  --server wss://panel.example.com \
  --token <TOKEN>
```

安装需要 sudo（写 systemd unit、建专用用户），但**装完之后探针是以非特权用户 `pulse` 运行的**。

装完检查一下：

```bash
systemctl status pulse-agent          # 应该是 active
ss -lntp | grep pulse                 # 应该没有输出 —— 探针不监听任何端口
systemd-analyze security pulse-agent  # 评分应为 2.0 左右
```

面板上这台机器一两秒内就会变绿。

## 下一步

- [安装选项](/install/agent) —— 安装脚本的全部参数、三平台差异、卸载
- [配置](/install/config) —— 环境变量完整清单
- [流量与账单](/faq/traffic) —— 计费周期、配额、到期提醒
- [通知](/faq/notify) —— Telegram / 企业微信 / Webhook / 邮件
