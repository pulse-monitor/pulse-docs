# 开发架构

面向要改代码的人。整体组件关系见[系统架构](/introduction/architecture)。

## Server 内部分层

```text
api/        HTTP / WebSocket 接口，只做参数校验和序列化
domain/     纯业务逻辑，不碰数据库、不碰网络 —— 这一层测试最密
store/      存储。抽象成 Storage trait，目前只有 SQLite 实现
tasks/      后台任务：上卷、清理、汇率、GeoIP、通知
state.rs    内存中的实时状态（环形缓冲、在线判定）
```

**`domain/` 刻意做成纯函数。** 账单折算、流量周期、告警阈值这些规则边界情况很多
（跨月、闰年、周期改动、时区），放在纯函数里才测得动。

## 存储层的三条约束

| 约束 | 为什么 |
|---|---|
| **写只有批量接口**，没有单行写 | 单行独立事务是 SQLite 慢的根源 |
| **读必须带时间范围与粒度** | 由 `plan_query` 决定走哪一层，保证任何跨度返回的点数都是恒定量级 |
| **读写连接池分开** | WAL 模式下写是单条的，读可以并发 |

## 数据分层

```text
原始层 ──每分钟写入
   │
   ├─上卷─> 分钟层
   │           │
   │        上卷─> 小时层
   │                   │
   │                上卷─> 天层
   │
 按保留策略分块删除
```

查询按请求的时间跨度自动选层，所以「最近 1 小时」和「最近 1 年」
返回的点数是同一个量级，库也不会随时间线性膨胀。

## 实时与历史是两条路

- **实时视图**读内存里的环形缓冲，不查库
- **历史图表**查库，走上面的分层

在线判定也在内存里，不是「查最后一条记录的时间戳」。

## 数据库迁移

**已发布的迁移文件一个字节都不能改，连注释也不行。**

sqlx 会对每个迁移文件算校验和记进库里。文件一变，已部署的实例启动就报
`migration N was previously applied but has been modified`，然后进入重启循环，
而且从报错里看不出是谁改了它。

要改 schema 就**加一个新文件**。批量替换、格式化工具都要把 `migrations/` 排除在外。

`tools/check-migrations.sh` 在 CI 里守着这条，新增迁移时用 `--update` 登记。

## 协议兼容

Agent 与 Server 之间是 WebSocket + JSON，定义在 `crates/pulse-proto`
（Server 仓库）。

改协议时**必须保证向后兼容**： Server 会先于 Agent 升级，老 Agent 得能继续上报。
`pulse-proto` 里有一组「老消息仍能解析」的测试专门盯这件事。

**改完记得给 proto 打新 tag** —— Agent 仓库按 tag 引用它，
不打的话那边取不到。 Server 发版时 Release workflow 会自动打。

细节见 [Agent 协议](/dev/protocol)。

## 镜像里的前端是哪个版本

Server 镜像要把前端一起打进去（面板靠 `PULSE_WEB_DIR` 提供静态文件）。
做法是**下 pulse-web 的 Release 产物并校验 SHA256**，版本号写死在
`deploy/docker/Dockerfile.server` 的 `ARG PULSE_WEB_VERSION` 里。

::: warning 不要改回「clone main 现场构建」
早先就是 `git clone --depth 1 --branch main` 然后 `npm run build`，
有两个毛病，都真踩过：

1. **镜像里是哪个版本的前端，取决于「构建那一刻 main 长什么样」** ——
   事后无从查证，也没法复现某个历史镜像。
2. **buildx 的层缓存会骗人**。clone 那一层的缓存键只看命令文本，而
   `--branch main` 这条命令文本从不变化，于是 main 往前走了它照样命中缓存，
   新提交根本进不了镜像。实测：修复提交比镜像构建早 16 分钟，
   镜像里却还是旧代码 —— 而且从构建日志上完全看不出异常。

现在改版本必须显式改 Dockerfile 里那一行，缓存也骗不了人。
:::

**发前端新版的流程**：

```text
1. pulse-web 打 tag → Release workflow 发出 dist.tar.gz + SHA256SUMS
2. 改 pulse 仓库 Dockerfile.server 里的 ARG PULSE_WEB_VERSION
3. pulse 打 tag → 镜像带上新前端
```

## CI 里的几道守卫

| 仓库 | 脚本 | 拦什么 |
|---|---|---|
| pulse-agent | `tools/check-agent-hardening.sh` | Agent 不提权、不接受远程指令 —— 设计约束里机器可检的部分 |
| pulse | `tools/check-migrations.sh` | 已发布的迁移文件一个字节都不许改 |
| pulse / pulse-agent | `cargo metadata --locked` | Cargo.lock 必须已是最新。镜像构建用 `--locked`，而 clippy/test 不用 —— 改了版本号忘了同步 lock 时，CI 全绿而 Docker 单独挂掉，还要等十几分钟才看得到（踩过两次） |
| pulse | `tools/check-deps.sh` | 安全公告、许可证，以及「被忽略项的前提是否仍然成立」 |
| pulse-web | `scripts/check-dist.mjs` | 前端产物里的国旗数量、地图数据、垃圾文件 |
| 全部 | `actionlint` | workflow 文件本身。语法错误不会让某个 job 变红，而是整个 workflow 不启动 |

::: tip check-deps.sh 的最后一步
`.cargo/audit.toml` 里忽略某条公告的**唯一理由**是「那个包不在实际构建图里」。
哪天某个依赖真把它拉进来了，那条忽略就变成在掩盖一个真实漏洞 ——
所以脚本会独立验证这个前提是否仍然成立。
:::
