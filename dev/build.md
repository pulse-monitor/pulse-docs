# 开发指南

## 环境

| 需要 | 版本 | 说明 |
|---|---|---|
| Rust | 1.82+ | `rustup` 装即可 |
| Node.js | 20+ | 前端构建 |
| zig | 0.13+ | 可选，跨平台构建用（见下） |

## 目录结构

```
crates/
  pulse-proto/     探针与面板之间的协议定义（两边共用）
  pulse-agent/     探针：采集、上报、自更新
  pulse-server/    面板：API、存储、业务规则、通知
  pulse-loadgen/   压测工具，造假数据用
web/               前端（React + Vite）
deploy/            安装脚本、systemd unit、Docker
tools/             CI 用的各种检查脚本
```

### 面板内部分层

```
api/        HTTP / WebSocket 接口，只做参数校验和序列化
domain/     纯业务逻辑，不碰数据库、不碰网络 —— 这一层测试最密
store/      存储，SQLite 与 PostgreSQL 双方言
tasks/      后台任务：上卷、清理、汇率、GeoIP、通知
state.rs    内存中的实时状态（环形缓冲、在线判定）
```

**`domain/` 刻意做成纯函数。** 账单折算、流量周期、告警阈值这些规则边界情况很多
（跨月、闰年、周期改动、时区），放在纯函数里才测得动。

## 构建

```bash
cargo build --release          # 面板 + 探针
cd web && npm install && npm run build
```

前端构建会先跑 `prebuild`：从 `node_modules` 里拷国旗 SVG、生成地球用的国家多边形。
这两样是**生成物，不入库**。

### 跨平台

用 `cargo-zigbuild`，不必装各平台的 C 交叉编译器：

```bash
cargo install cargo-zigbuild
brew install zig                       # 或者别的装法

cargo zigbuild --release --target x86_64-unknown-linux-musl
cargo zigbuild --release --target aarch64-unknown-linux-musl
```

探针默认用 musl 静态链接 —— 这样一个二进制在任何 Linux 发行版上都能跑，不挑 glibc 版本。

## 测试

```bash
cargo test --workspace        # Rust
cd web && npm test            # 前端
```

跑得快是有意的（全套约十几秒），这样才会真去跑。慢的东西（真机安装、浏览器渲染）
放在单独的脚本里，不混进单元测试。

### 几条约定

- **测试锁的是「需求应该怎样」，不是「代码现在怎样」。** 后者永远全绿，毫无价值。
- **修 bug 先写一个当前必然失败的复现测试。** 没有复现就没有「修好了」，只有「暂时没再看见」。
- **断言消息写清楚为什么。** `assert_eq!(x, y, "为什么必须相等")` —— 将来这条红了，
  下一个人要能从消息里看懂它在保护什么。

## CI 里的几道守卫

| 脚本 | 拦什么 |
|---|---|
| `tools/check-agent-hardening.sh` | 探针不提权、不接受远程指令 —— 这是设计约束，机器可检的部分都在这 |
| `tools/check-migrations.sh` | 已发布的迁移文件一个字节都不许改（sqlx 会校验和，改了已部署实例全起不来） |
| `tools/check-deps.sh` | 安全公告、许可证，以及「被忽略项的前提是否仍然成立」 |
| `web/scripts/check-dist.mjs` | 前端产物里的国旗数量、地图数据、垃圾文件 |

## 数据库迁移

**已发布的迁移文件一个字节都不能改，连注释也不行。**

sqlx 会对每个迁移文件算校验和记进库里。文件一变，已部署的实例启动就报
`migration N was previously applied but has been modified`，然后进入重启循环，
而且从报错里看不出是谁改了它。

要改 schema 就**加一个新文件**。批量替换、格式化工具都要把 `migrations/` 排除在外。

## 提交

- 提交信息说清楚**为什么**，不是**做了什么** —— diff 已经说了做了什么
- 一次提交只做一件事
- CI 全绿再提 PR

## 协议

探针与面板之间是 WebSocket + JSON，定义在 `crates/pulse-proto`。

改协议时**必须保证向后兼容**：面板会先于探针升级，老探针得能继续上报。
`pulse-proto` 里有一组「老消息仍能解析」的测试专门盯这件事。
