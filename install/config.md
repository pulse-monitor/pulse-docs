# 配置

Server 的全部配置都通过环境变量给。没有配置文件 —— 一份 systemd unit 或者一段 compose
就能把部署说清楚。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PULSE_BIND` | `127.0.0.1:25774` | 监听地址 |
| `PULSE_PUBLIC_URL` | 由监听地址推导 | **生成安装命令时写进去的地址**，装在别的机器上必须设对 |
| `PULSE_DATABASE_URL` | `sqlite://data/pulse.db` | 数据库位置。目前只支持 `sqlite://` |
| `PULSE_DATA_DIR` | `data` | 数据目录（GeoIP 缓存、服务端密钥） |
| `PULSE_SECRET_KEY` | 自动生成 | 服务端密钥（64+ 个 hex 字符）。不设则在 `PULSE_DATA_DIR/secret.key` 生成。**丢了等于所有通知渠道的凭据都解不开**，务必单独备份 |
| `PULSE_WEB_DIR` | `web/dist` | 前端静态文件目录 |
| `PULSE_ADMIN_PASSWORD` | 空 | **可选**。设了就在首次启动时建好管理员，初始化页面随之关闭；不设则由第一个访问面板的人自行设定 |
| `PULSE_ADMIN_USERNAME` | `admin` | 仅在设了 `PULSE_ADMIN_PASSWORD` 时有意义 |
| `PULSE_TLS_CERT` / `PULSE_TLS_KEY` | 空 | 配上就直接跑 HTTPS，两个必须同时给 |
| `PULSE_TRUSTED_PROXY_HOPS` | `0` | 放在反代后面时设成代理层数 |
| `PULSE_PUBLIC_MODE` | `public` | 设成 `private` 则公开页需要登录 |
| `PULSE_TIMEZONE` | `Asia/Shanghai` | Server 时区，影响账单周期的日界 |
| `PULSE_DISPLAY_CURRENCY` | `CNY` | 汇总金额用的币种 |
| `PULSE_RATE_BASE_URL` | 内置 | 汇率源（Frankfurter 兼容接口） |
| `PULSE_VISITOR_BADGE` | `true` | 页脚显示访客 IP / 系统 / 浏览器 |
| `PULSE_LOG` | `info` | 日志级别 |

## 关于时区

账单周期是「你和商家的约定」，用统一时区才可解释。机器时区五花八门的话，
同一天的流量重置会发生在不同时刻。所以周期日界一律按 `PULSE_TIMEZONE` 算，
不看机器自己的时区。

## 存储

目前**只支持 SQLite**，`PULSE_DATABASE_URL` 只接受 `sqlite://` 开头的地址。

存储层已经抽象成 `Storage` trait，将来接别的后端时不必动上层，
但在真写出第二个实现之前，不要指望 `postgres://` 能用。

50 ～ 200 台机器 SQLite 足够。数据分层上卷（原始 → 分钟 → 小时 → 天），
查询按时间跨度自动选层，所以库不会随时间线性膨胀。

## 反向代理

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

配了反代**一定要设 `PULSE_TRUSTED_PROXY_HOPS`**，否则登录限流和访客标签
看到的都是反代自己的 IP。默认 0 是「直连部署」的正确取值。

### 这个值该设几

Pulse 取 `X-Forwarded-For` 里**倒数第 `hops` 个**地址。所以它等于
「你自己控制的、会往 XFF 里追加内容的代理层数」：

| 部署形态 | 值 |
|---|---|
| 直接暴露端口 | `0`（默认） |
| 一层 nginx / Caddy | `1` |
| Cloudflare Tunnel 直连 Pulse | `1` |
| Cloudflare → 你的 nginx → Pulse | `2` |

设小了会拿到内网代理的 IP，设大了会越过客户端拿到不存在的条目而回落成
对端地址。装好后打开面板，页脚的访客标签显示的就是 Pulse 认定的客户端 IP ——
和你自己的公网 IP 对一下就知道设对没有。

## Cloudflare Tunnel（cloudflared）

用 Cloudflare Tunnel 的话，**VPS 上一个入站端口都不用开** —— cloudflared
主动向 Cloudflare 建立出站连接，流量从那条隧道回来。这和 Pulse 自己的
连接方向是一致的（Agent 也是主动外连），整台机器可以对公网完全关闭。

Pulse 只监听本地：

```bash
PULSE_BIND=127.0.0.1:25774
PULSE_PUBLIC_URL=https://pulse.example.com   # 隧道的域名
PULSE_TRUSTED_PROXY_HOPS=1
```

隧道配置：

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: pulse.example.com
    service: http://127.0.0.1:25774
  - service: http_status:404
```

```bash
cloudflared tunnel login
cloudflared tunnel create pulse
cloudflared tunnel route dns pulse pulse.example.com
cloudflared service install       # 装成 systemd 服务
```

Agent 那边用 `wss://pulse.example.com` —— 域名和普通反代没有区别。

::: warning WebSocket 与空闲超时
Agent 走的是 WebSocket 长连接。Cloudflare 支持 WebSocket，但**空闲连接会被
断开**。Pulse 的 Agent 默认每几秒就上报一次，正常情况下不会空闲到被断；
真断了也只是按退避重连，不会丢累计数据（见[流量](/usage/traffic)）。

如果日志里频繁出现重连，把上报间隔调小一些。
:::

::: tip 为什么不是 CF-Connecting-IP
Cloudflare 会同时给 `CF-Connecting-IP` 和 `X-Forwarded-For`，Pulse 只读后者。
少一个「需要信任的请求头」就少一处可被伪造的入口 —— XFF 配合 hops
已经能拿到正确的客户端 IP（上面的表格实测过）。
:::

## 自签证书 / 私有 CA

内网部署或域名还没备案时可以用。 Agent 默认只信任内置的公共 CA 列表，
所以要**额外**告诉它信任你的 CA：

```bash
curl -fsSL https://panel.example.com/install.sh | sudo bash -s -- \
  --server wss://panel.example.com --token <TOKEN> \
  --ca-cert /etc/pulse-agent/ca.pem
```

这是「往信任集里加一条」，**不是「关掉校验」** —— 证书链、有效期、主机名照样验。
没有跳过校验的开关，也不打算加。

> `openssl req -x509` 直接签出来的是 **CA 证书**， Agent 会拒绝（`CaUsedAsEndEntity`）。
> 服务器证书要用 `basicConstraints=CA:FALSE` + `extendedKeyUsage=serverAuth` 单独签，
> 且 SAN 里要包含你连的那个域名或 IP。
