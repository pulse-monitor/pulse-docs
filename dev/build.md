# 开发指南

## 环境

| 需要 | 版本 | 说明 |
|---|---|---|
| Rust | 1.82+ | `rustup` 装即可 |
| Node.js | 20+ | 前端构建 |
| zig | 0.13+ | 可选，跨平台构建用（见下） |

## 四个仓库

| 仓库 | 内容 |
|---|---|
| [pulse](https://github.com/pulse-monitor/pulse) | Server + 协议定义 |
| [pulse-web](https://github.com/pulse-monitor/pulse-web) | 前端（React + Vite） |
| [pulse-agent](https://github.com/pulse-monitor/pulse-agent) | Agent：采集、上报、自更新 |
| [pulse-docs](https://github.com/pulse-monitor/pulse-docs) | 这份文档 |

三处跨仓库的接缝，改动时要留意：

**协议**（`pulse-proto`）在Server 仓库里 —— 它是 server 与 agent 之间的契约，由 server
那边定版。 Agent 按 tag 引用它，所以**改协议要记得给 proto 打新 tag**（面板发版时
Release workflow 会自动打）。本地联调时用 patch 指向本地 checkout：

```toml
# pulse-agent/.cargo/config.toml
[patch."https://github.com/pulse-monitor/pulse"]
pulse-proto = { path = "../pulse/crates/pulse-proto" }
```

**前端产物**由Server 通过 `PULSE_WEB_DIR` 提供。Server 的安装脚本从 pulse-web 的 Release
下 `pulse-web-dist.tar.gz`； Docker 镜像则按 ref 克隆 pulse-web 现场构建，
这样镜像构建和前端发版不必互相等。

**Agent 的安装脚本**（`deploy/scripts/install.sh`）留在**面板**仓库：它被 `include_str!`
编译进面板、由 `GET /install.sh` 提供，命令行参数也是Server 生成的，跟面板的耦合比跟
Agent 更紧。它下载的 Agent 二进制指向 pulse-agent 的 Release。

### Server 仓库结构

```
crates/
  pulse-proto/     协议定义（Agent按 tag 引用）
  pulse-server/    Server：API、存储、业务规则、通知
  pulse-loadgen/   压测工具，造假数据用
deploy/            安装脚本、Docker
tools/             CI 用的各种检查脚本
```

### Server 内部分层、数据分层、迁移约束

见[开发架构](/dev/architecture)。

## 构建

三个仓库各自独立构建：

```bash
# 面板
cd pulse       && cargo build --release
# Agent
cd pulse-agent && cargo build --release
# 前端
cd pulse-web   && npm install && npm run build
```

前端构建会先跑 `prebuild`：从 `node_modules` 里拷国旗 SVG、生成地球用的国家多边形。
这两样是**生成物，不入库**。

本地跑面板时把前端指过去：

```bash
PULSE_WEB_DIR=../pulse-web/dist cargo run -p pulse-server
```

### 跨平台

用 `cargo-zigbuild`，不必装各平台的 C 交叉编译器：

```bash
cargo install cargo-zigbuild
brew install zig                       # 或者别的装法

cargo zigbuild --release --target x86_64-unknown-linux-musl
cargo zigbuild --release --target aarch64-unknown-linux-musl
```

Agent 默认用 musl 静态链接 —— 这样一个二进制在任何 Linux 发行版上都能跑，不挑 glibc 版本。

## 测试

```bash
cargo test --workspace        # Rust
cd pulse-web && npm test      # 前端
```

跑得快是有意的（全套约十几秒），这样才会真去跑。慢的东西（真机安装、浏览器渲染）
放在单独的脚本里，不混进单元测试。

### 几条约定

- **测试锁的是「需求应该怎样」，不是「代码现在怎样」。** 后者永远全绿，毫无价值。
- **修 bug 先写一个当前必然失败的复现测试。** 没有复现就没有「修好了」，只有「暂时没再看见」。
- **断言消息写清楚为什么。** `assert_eq!(x, y, "为什么必须相等")` —— 将来这条红了，
  下一个人要能从消息里看懂它在保护什么。

## 提交

- 提交信息说清楚**为什么**，不是**做了什么** —— diff 已经说了做了什么
- 一次提交只做一件事
- CI 全绿再提 PR

## 协议

见 [Agent 协议](/dev/protocol) 与[开发架构](/dev/architecture#协议兼容)。
