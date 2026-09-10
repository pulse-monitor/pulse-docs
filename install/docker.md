# Docker 部署

镜像同时发在 **GHCR** 和 Docker Hub。推荐用 GHCR —— 公开镜像没有拉取限额。

```
ghcr.io/pulse-monitor/pulse:latest
jinqians/pulse-server:latest
```

支持 `linux/amd64` 与 `linux/arm64`。

## docker compose

```yaml
services:
  pulse:
    image: ghcr.io/pulse-monitor/pulse:latest
    container_name: pulse
    restart: unless-stopped
    ports:
      - "25774:25774"
    volumes:
      - ./data:/data
    environment:
      PULSE_BIND: 0.0.0.0:25774
      PULSE_DATA_DIR: /data
      PULSE_DATABASE_URL: sqlite:///data/pulse.db
      PULSE_PUBLIC_URL: https://panel.example.com
      PULSE_TIMEZONE: Asia/Shanghai
```

```bash
docker compose up -d
docker compose logs -f
```

## docker run

```bash
docker run -d --name pulse --restart unless-stopped \
  -p 25774:25774 \
  -v "$PWD/data:/data" \
  -e PULSE_PUBLIC_URL=https://panel.example.com \
  ghcr.io/pulse-monitor/pulse:latest
```

## 关于镜像

- 基于 `distroless`，**没有 shell** —— 攻进去也没有趁手的工具
- 以 uid 65532 的非 root 用户运行
- 前端静态文件已经打进镜像，不用另外挂载
- 数据全在 `/data` 这一个卷里，备份直接打包它

## 反代后面

Server 在容器里监听 `0.0.0.0:25774`，宿主机上用 nginx / Caddy 转发即可。
记得设 `PULSE_TRUSTED_PROXY_HOPS`，否则拿到的客户端 IP 是反代的。

## 升级

```bash
docker compose pull && docker compose up -d
```

数据库迁移会在启动时自动跑。

::: tip 迁移是单向的
降级回旧版本可能起不来（旧版认不出新加的表）。升级前把 `data/` 备份一下。
:::
