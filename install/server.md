# Server 部署

Server 是**单个静态二进制**，不需要数据库、不需要运行时。三种装法，任选其一。

## 一键脚本（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/pulse-monitor/pulse/main/deploy/scripts/install-server.sh \
  | sudo bash -s -- --url https://panel.example.com
```

脚本会：下载并校验摘要 → 建专用用户 `pulse-server` → 写一份加固过的 systemd unit
→ 起服务 → 打印随机生成的管理员密码。

::: warning `--url` 装在公网上必须给
它是**生成 Agent 安装命令时写进去的地址**。不给的话脚本会按本机公网 IP 猜一个，
用域名的话 Agent 会连不上。
:::

### 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--url` | 按公网 IP 猜 | Server 对外地址 |
| `--bind` | `0.0.0.0:25774` | 监听地址 |
| `--dir` | `/opt/pulse` | 安装目录 |
| `--version` | 最新 | 指定版本 |
| `--tls-cert` / `--tls-key` | 空 | 配上就直接跑 HTTPS，两个必须同时给 |
| `--uninstall` | — | 卸载（**保留数据目录**） |

## 手动装二进制

```bash
curl -fsSL https://github.com/pulse-monitor/pulse/releases/latest/download/pulse-server-x86_64-unknown-linux-musl \
  -o pulse-server && chmod +x pulse-server

PULSE_BIND=0.0.0.0:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
./pulse-server
```

首次启动**不建任何管理员**：打开面板，第一个访问的人自行设定用户名和密码。

在设置完成之前，任何能访问该地址的人都能抢先创建管理员 —— 所以装完请立刻去设置。
无人值守部署可用 `PULSE_ADMIN_PASSWORD`（可配 `PULSE_ADMIN_USERNAME`）预先建好，
那样初始化接口从一开始就是关的。

前端静态文件从 release 里的 `web-dist.tar.gz` 取，解开后用 `PULSE_WEB_DIR` 指过去。

## Docker

见 [Docker 部署](/install/docker)。

## 一定要走 HTTPS

::: danger Agent 的 token 放在 WebSocket 握手头里
走明文 `ws://` 的话，链路上任何一跳都能拿到它 —— 拿到就能冒充这台机器上报数据。
Server 启动时会检查，`PULSE_PUBLIC_URL` 是公网明文地址就打一条 WARN。
:::

### 甲：Server 自己跑 HTTPS

```bash
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TLS_CERT=/etc/pulse/tls/fullchain.pem \
PULSE_TLS_KEY=/etc/pulse/tls/privkey.pem \
./pulse-server
```

两个变量**必须同时给**，只给一个会直接启动失败 —— 「以为开了 TLS 其实没开」比起不来危险得多。
证书续期后要重启 Server才会加载新的。

### 乙：放在 nginx / Caddy 后面

```bash
PULSE_BIND=127.0.0.1:25774 \
PULSE_PUBLIC_URL=https://panel.example.com \
PULSE_TRUSTED_PROXY_HOPS=1 \
./pulse-server
```

nginx 的最小配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:25774;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;   # WebSocket 是长连接，短了会每分钟踢一次
}
```

::: warning 配了反代一定要设 `PULSE_TRUSTED_PROXY_HOPS`
不设的话，登录限流和访客标签看到的都是反代自己的 IP。默认 0 是「直连部署」的正确取值。
:::
