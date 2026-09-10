# Docker 部署

镜像同时发在 **GHCR** 和 Docker Hub。推荐 GHCR —— 公开镜像没有拉取限额。

```text
ghcr.io/pulse-monitor/pulse:latest    # Server
jinqians/pulse-server:latest          # Docker Hub 镜像

ghcr.io/pulse-monitor/pulse-agent:latest   # Agent
jinqians/pulse-agent:latest
```

两个镜像都支持 `linux/amd64` 与 `linux/arm64`。

## 最小可用

新建一个目录，放进 `compose.yml`：

```yaml
services:
  server:
    image: ghcr.io/pulse-monitor/pulse:latest
    container_name: pulse
    restart: unless-stopped
    ports:
      - "25774:25774"
    volumes:
      - pulse-data:/data
    environment:
      PULSE_BIND: "0.0.0.0:25774"
      PULSE_PUBLIC_URL: "https://panel.example.com"

volumes:
  pulse-data:
```

```bash
docker compose up -d
docker compose logs -f
```

然后打开 `PULSE_PUBLIC_URL`，**第一个访问的人设定管理员账号**。

::: warning PULSE_PUBLIC_URL 必须改
它会被写进 Agent 的安装命令。留着 `panel.example.com` 的话，
装出来的 Agent 会去连一个不存在的域名。
:::

## 卷：用具名卷，别用 bind mount

上面用的是**具名卷**（`pulse-data:/data`），这不是随手写的：

镜像里的 `/data` 属主是 uid 65532，容器也以这个身份运行。Docker 建**具名卷**时
会照搬镜像里同名目录的属主，所以开箱即用。

而 **bind mount**（`-v ./data:/data`）用的是宿主目录的属主 —— 默认是 root，
容器写不进去，启动直接报：

```text
Error: 打开数据库失败: sqlite:///data/pulse.db
Caused by: (code: 14) unable to open database file
```

非要用 bind mount 的话，先把宿主目录的属主改对：

```bash
mkdir -p ./data && sudo chown 65532:65532 ./data
```

## 完整模板

```yaml
services:
  server:
    image: ghcr.io/pulse-monitor/pulse:latest
    container_name: pulse
    restart: unless-stopped
    ports:
      # 放在反代 / 隧道后面时改成 "127.0.0.1:25774:25774"，
      # 这样宿主机对公网不开这个端口
      - "25774:25774"
    volumes:
      # pulse.db + secret.key + GeoIP 缓存，备份直接打包它
      - pulse-data:/data
    environment:
      PULSE_BIND: "0.0.0.0:25774"
      # 生成 Agent 安装命令时会写进去，必须是用户实际访问的对外地址
      PULSE_PUBLIC_URL: "https://panel.example.com"
      # 前面有几层可信反代就填几，直连填 0
      PULSE_TRUSTED_PROXY_HOPS: "1"
      PULSE_PUBLIC_MODE: "public"      # public | private
      PULSE_TIMEZONE: "Asia/Shanghai"
      PULSE_DISPLAY_CURRENCY: "CNY"
      # 日志级别的变量名是 PULSE_LOG，不是 RUST_LOG
      PULSE_LOG: "info"
      # 可选：设了就在首次启动建好管理员、初始化页面随之关闭
      # PULSE_ADMIN_PASSWORD: "至少八位"

volumes:
  pulse-data:
```

全部环境变量见[配置](/install/config)。

## 常用命令

```bash
docker compose up -d                 # 起
docker compose logs -f               # 看日志
docker compose logs -f --tail 100    # 只看最近 100 行
docker compose restart               # 重启
docker compose down                  # 停（保留卷）
docker compose down -v               # 停并删掉数据卷 ⚠️
```

## 升级

```bash
docker compose pull && docker compose up -d
```

数据库迁移会在启动时自动跑。

::: tip 迁移是单向的
降级回旧版本可能起不来（旧版认不出新加的表）。升级前备份一下卷：

```bash
# compose 会给卷名加上项目名前缀（默认是所在目录名），
# 所以先问它要真实的卷名，别照着 compose.yml 里的短名写
VOL=$(docker compose config --volumes | head -1)
VOL="$(basename "$PWD")_${VOL}"

docker run --rm -v "$VOL":/data -v "$PWD":/backup alpine \
  tar czf /backup/pulse-backup.tgz -C /data .
```
:::

恢复（先停掉容器，别在写着的时候覆盖数据库）：

```bash
docker compose stop
docker run --rm -v "$VOL":/data -v "$PWD":/backup alpine \
  sh -c "cd /data && tar xzf /backup/pulse-backup.tgz"
docker compose start
```

整套流程实测过：备份 → `docker compose down -v` 毁掉 → 恢复，
管理员账号和历史数据都回来了。

## 健康检查

公开的健康接口是 **`/api/v1/health`**（不需要认证，也不返回内部细节）：

```bash
curl -fsS http://127.0.0.1:25774/api/v1/health
# {"status":"ok","version":"0.0.1"}
```

::: warning compose 里写不了 healthcheck
镜像基于 distroless，**里面没有 shell、没有 curl、没有 wget**，
所以 `test: ["CMD-SHELL", "curl -f ..."]` 这类写法一定失败，
容器会永远显示 unhealthy。

要监控就在**宿主机**上探上面那个 HTTP 接口。
:::

## 反代与隧道

Server 在容器里监听 `0.0.0.0:25774`，宿主机上用 nginx / Caddy 转发即可，
或者用 [Cloudflare Tunnel](/install/config#cloudflare-tunnel-cloudflared)
（那样连宿主机的入站端口都不用开，把端口映射改成
`127.0.0.1:25774:25774`，隧道指向它）。

记得设 `PULSE_TRUSTED_PROXY_HOPS`，否则拿到的客户端 IP 是反代的 ——
[该设几看这里](/install/config#这个值该设几)。

## 用 Docker 装 Agent

Agent 也有镜像。要采到**宿主机**的指标，三个参数缺一不可：

```yaml
services:
  agent:
    image: ghcr.io/pulse-monitor/pulse-agent:latest
    container_name: pulse-agent
    restart: always
    network_mode: host
    pid: host
    volumes:
      - "/:/rootfs:ro,rslave"
    environment:
      PULSE_SERVER: "wss://panel.example.com"
      PULSE_TOKEN: "<后台生成的 TOKEN>"
      PULSE_ROOTFS: "/rootfs"
```

| 参数 | 去掉的后果 |
|---|---|
| `network_mode: host` | 采到的是容器的网卡，不是宿主机的 |
| `pid: host` | 进程数只能看到容器里的那一两个 |
| `-v /:/rootfs:ro,rslave` + `PULSE_ROOTFS` | 磁盘用量是容器层的，不是宿主机的 |

::: tip 不需要 --privileged
只读挂载就够。Agent 镜像基于 `scratch`，**里面没有 shell** ——
连 `docker exec` 进去都做不到。以 uid 65532 运行。
:::

后台的「安装命令」对话框会直接生成填好 token 的 `docker run` 和 compose 两种写法。

## 关于镜像

| | |
|---|---|
| 基础镜像 | Server 用 `distroless/cc`，Agent 用 `scratch` —— **都没有 shell** |
| 运行身份 | uid 65532，非 root |
| 前端 | 已经打进 Server 镜像，不用另外挂 |
| 数据 | 全在 `/data` 一个卷里 |
| 构建 | 交叉编译，不用 QEMU 模拟 |
