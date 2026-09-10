# Agent 安装选项

安装脚本 `install.sh` 的完整参数。所有参数都可以在后台的「安装命令」对话框里勾选，
生成好的命令直接贴到机器上即可。

## 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--server` | 必填 | Server 地址，`wss://panel.example.com` |
| `--token` | 必填 | 该机器的凭据，后台生成 |
| `--install-dir` | `/opt/pulse-agent` | 安装目录 |
| `--interval` | `2` | 上报间隔（秒） |
| `--net-include` | 空 | 只统计这些网卡（逗号分隔，支持 `eth*` 通配） |
| `--net-exclude` | 内置黑名单 | 排除这些网卡 |
| `--enable-gpu` | 关 | 采集 GPU 使用率。**官方发布的二进制用不了，见下** |
| `--disable-auto-update` | 关 | 关掉自更新，面板会显示「可升级」由你手动升 |
| `--download-base` | 官方源 | 自建镜像源时用 |
| `--update-base` | 空 | 自更新的下载源，不设则自更新不可用 |
| `--ca-cert` | 空 | 额外信任的 CA 证书（Server 用私有 CA / 自签证书时） |
| `--uninstall` | — | 卸载 |

> `--download-base` 和 `--update-base` **必须是命令行参数，不能只靠环境变量** ——
> 安装命令是 `curl… | sudo bash` 的形式，`sudo` 默认会清掉环境变量。

::: warning 这些参数是给安装脚本的，不是给 Agent 二进制的
Agent 本身**一个命令行参数都不接受**，配置全走环境变量
（`PULSE_SERVER`、`PULSE_TOKEN`、`PULSE_AUTO_UPDATE`、`PULSE_UPDATE_BASE`、
`PULSE_CA_CERT`）。安装脚本会把上面的参数翻译成 systemd unit 里的环境变量。

手动运行时给了参数会**直接报错**，不会被静默忽略 —— 否则它会连去默认的
`ws://127.0.0.1:25774` 然后一直 401，日志里完全看不出参数没生效。

token 之所以不做成参数：命令行对同机任何用户都能通过 `ps` 看到。
:::

## GPU

**官方发布的二进制采不了 GPU。** `capabilities.gpu_nvml` 会如实报 `false`，
面板上那一行直接隐藏。

原因是这样：Agent 按 R18 的要求**绝不调用 `nvidia-smi` 子进程**，而是动态加载
NVML 库（`libnvidia-ml.so.1`）。但官方二进制是 **musl 静态链接**的 ——
静态链接的程序没法 `dlopen`，所以这条路在发布版里走不通。

要用的话得自己编一个动态链接的版本：

```bash
git clone https://github.com/pulse-monitor/pulse-agent
cd pulse-agent
cargo build --release --features gpu --target x86_64-unknown-linux-gnu
```

这样构出来的二进制在**有** NVIDIA 驱动的机器上会自动认出 GPU，
没有驱动时静默降级、如实报 `false`，不会出错。

代价是它依赖宿主机的 glibc，不像 musl 静态版那样「一个文件到处跑」。

## 用 Docker 装

后台的「安装命令」对话框里也有 Docker 和 Compose 两种写法，直接复制即可。
形如：

```bash
docker run -d --name pulse-agent --restart=always \
  --network host \
  --pid host \
  -v /:/rootfs:ro,rslave \
  -e PULSE_SERVER=wss://panel.example.com \
  -e PULSE_TOKEN=<TOKEN> \
  -e PULSE_ROOTFS=/rootfs \
  ghcr.io/pulse-monitor/pulse-agent:latest
```

三个参数各自的作用，去掉哪个会丢什么：

| 参数 | 去掉的后果 |
|---|---|
| `--network host` | 采到的是容器的网卡，不是宿主机的 |
| `--pid host` | 进程数只能看到容器里的那一两个 |
| `-v /:/rootfs:ro,rslave` + `PULSE_ROOTFS` | 磁盘用量是容器层的，不是宿主机的 |

::: tip 不需要 --privileged
只读挂载就够。镜像基于 `scratch`，**里面没有 shell** ——
连 `docker exec` 进去都做不到。以 uid 65532 运行。
:::

镜像同时发在两处，任选：

```text
ghcr.io/pulse-monitor/pulse-agent:latest   # 公开镜像，无拉取限额
jinqians/pulse-agent:latest                # Docker Hub 镜像
```

支持 `linux/amd64` 和 `linux/arm64`。

## 网卡过滤

默认排除这些（虚拟网卡、容器网桥、隧道）：

```
lo lo0 veth* docker* br-* virbr* tun* tap* kube* cni*
flannel* zt* wg* utun* awdl* llw* bridge* vmnet* gif* stf*
```

`--net-include` 一旦给了就**只统计**列出的网卡，`--net-exclude` 不再生效。

## 三个平台

### Linux

默认用 musl 静态链接，一个二进制在任何发行版上都能跑。

装完之后：

- 以非特权用户 `pulse` 运行
- 零 capabilities （`getpcaps` 输出为空）
- 不监听任何端口
- systemd 加固评分约 2.0

**非 root 采不到的东西会如实标记为「不可用」，而不是显示 0。** 比如某些机器上的
CPU 温度需要额外权限，那一项就整块不显示 —— 显示 0°C 是撒谎。

### Windows

```powershell
irm https://panel.example.com/install.ps1 -OutFile install.ps1
.\install.ps1 -Server wss://panel.example.com -Token <TOKEN>
```

装成 Windows 服务，以 `LocalService` 运行。

### macOS

装成 launchd 用户级 agent，不需要 root：

```bash
curl -fsSL https://panel.example.com/install.sh | bash -s -- \
  --server wss://panel.example.com --token <TOKEN>
```

## 自更新

Agent 可以自己升级，但有 5 道防线：

1. **下载源只从本地配置读** —— Server 影响不了它。Server 即使被攻陷也指不了源
2. **签名校验** —— minisign 公钥内置在二进制里
3. **摘要比对** —— 下载完先对 SHA-256
4. **拒绝降级** —— 版本号必须更高
5. **试用期回滚** —— 新版本起来后要在限定时间内成功连上 Server并上报，否则自动回退到旧版本

不配 `--update-base` 就整个关掉，面板会如实显示「需手动升级」。

## 卸载

```bash
sh install.sh --uninstall
```

会停服务、删 unit、删二进制和配置，**不动 Server 上的历史数据**。要一并清掉的话，
在后台把这台机器删掉。
