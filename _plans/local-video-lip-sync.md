# 后盾云短视频助手本地音色、视频对口型与平台发布编码计划

## 0. 文档状态

- 状态：执行中（未完成）
- 状态说明：用户于 2026-09-08 06:47:20 +0800 确认“视频音色”“生成视频”“发布视频”三个配置页面；Plan 已按确认后的 Spec 重建页面、路由、菜单和跨页状态验证步骤，不扩大其他范围。

## 1. 基本信息

- feature-slug：local-video-lip-sync
- Spec：`_specs/local-video-lip-sync.md`（已确认）
- 基线：main / a76c991741a68b575c08f611df7f43631e607716
- feature 分支：electron/local-video-lip-sync
- worktree：/Users/hd/code/talkHero-local-video-lip-sync
- 模块归属：`apps/inference`、`apps/voice`、`apps/video`、`apps/publish`
- 范围来源：仅上述 Spec

## 2. 引用清单

- FR-001～FR-015；EDGE-001～EDGE-015；NFR-001～NFR-010；已批准 AP-001～AP-004；AC-001～AC-013；无 Q。

## 3. 实施原则

- 最小必要修改；不做范围外重构；状态机、IPC、路径、持久化、发布幂等与失败恢复采用风险型 TDD；模型质量、GPU 性能、桌面和真实网页采用真实验收。
- Electron 只编排受管 Worker、媒体工具与浏览器；renderer 只经 preload 使用带版本的结构化协议，不传媒体 Buffer。
- 源媒体只读，生成物原子写入受管目录；未经真实证据不宣称 Windows 模型质量、性能或平台提交通过。

## 4. 影响范围

| 模块或文件                                                                                                                 | 计划变更                                                                               | 对应编号                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/inference/**`                                                                                                        | 协议、环境/资源检查、一键下载/校验/原子安装、Worker 生命周期、队列/取消/恢复、受管目录 | FR-002、FR-009、EDGE-005～EDGE-009、NFR-001、NFR-005～NFR-009、AC-001、AC-007、AC-011～AC-012                    |
| `apps/voice/**`                                                                                                            | B 视频校验、音色原子 CRUD、TTS 任务装配，并拆出独立音色配置与可复用文案音频内容        | FR-001、FR-003～FR-005、FR-014～FR-015、EDGE-001、EDGE-003、EDGE-013～EDGE-014、AC-002～AC-003、AC-013           |
| `apps/video/**`                                                                                                            | 在“生成视频”页组合文案音频、媒体/人脸质检、局部口型、音轨/输出与当前结果预览           | FR-001、FR-006～FR-010、EDGE-002～EDGE-006、EDGE-012、EDGE-015、NFR-002～NFR-005、AC-004～AC-008、AC-011、AC-013 |
| `apps/publish/**`                                                                                                          | 独立“发布视频”路由、历史/当前视频预览、发布文案、三封面、草稿指纹与平台状态机          | FR-001、FR-010～FR-015、EDGE-010～EDGE-012、EDGE-014、AC-008～AC-010、AC-013                                     |
| `config/main.ts`、`config/preload.shared.ts`、`config/routes.ts`、`config/window.ts`、`config/menus.tsx`、`config/dock.ts` | 四模块、bridge、“视频音色”/“生成视频”/“发布视频”/“本地推理”菜单及 `setting` 路由装配   | FR-001、NFR-006、NFR-010、AC-012～AC-013                                                                         |
| `package.json`、锁文件                                                                                                     | 仅加入 AP-001 所需的最小 Playwright 运行依赖（若平台适配器实现需要）                   | AP-001、FR-011～FR-013                                                                                           |
| `electron-builder.yml`                                                                                                     | 将不含模型/运行时的 Worker 协议脚本复制到安装包资源目录                                | FR-002、EDGE-008、NFR-006、AC-012                                                                                |
| 四模块 README、`docs/release.md`                                                                                           | 记录职责、公共边界、验证及恢复                                                         | NFR-009～NFR-010、AC-012                                                                                         |

## 5. 前置依赖与顺序

1. 先建立受管路径、协议、状态机和 IPC 安全边界，再实现 voice/video/publish，避免业务模块直接接触第三方内部结构（FR-002、NFR-005～NFR-006）。
2. AP-002～AP-003 只通过固定清单、哈希和 Worker 适配边界接入；权重、运行时和二进制不进入仓库或安装包。
3. AP-001 浏览器资料按平台隔离；AP-004 的实际提交仍需当前任务中的用户明确点击，测试不得访问真实账号或提交内容。

## 6. 风险与验证

| 风险                                   | 等级 | 对应编号                                              | 验证                                                               |
| -------------------------------------- | ---: | ----------------------------------------------------- | ------------------------------------------------------------------ |
| IPC/路径/子进程越权                    |   高 | EDGE-005、NFR-005～NFR-006、AC-001、AC-006、AC-012    | parser、sender、受管路径、固定命令和攻击输入测试                   |
| 状态/持久化错误导致假成功或数据损坏    |   高 | EDGE-008～EDGE-009、EDGE-013、NFR-008、AC-002、AC-007 | 状态转换、原子提交、崩溃恢复、删除失败注入测试                     |
| 修改错误人物或嘴部外画面               |   高 | EDGE-004、NFR-003～NFR-004、AC-004～AC-005            | 策略/坐标/失败区间测试；Windows 授权素材差分与人工验收             |
| 发错或重复发布                         |   高 | EDGE-010～EDGE-012、NFR-009、AC-009～AC-010           | 域名、草稿指纹、单次令牌、页面状态 fixture；真实页面默认停在提交前 |
| 供应链、显存与性能                     |   高 | EDGE-006～EDGE-007、NFR-001～NFR-002、AC-001、AC-011  | 固定来源/哈希测试；Windows 4GB/6GB 基准和 OOM 实测                 |
| 跨页面迟到响应、操作重入或发布错绑视频 |   高 | EDGE-012、EDGE-015、AC-008～AC-010、AC-013            | 共享会话锁、历史任务/文件指纹、预览/草稿/平台一致性回归            |

## 7. TDD 顺序

### TDD-1：协议、环境、任务与恢复

- 关联编号：FR-002、FR-009、EDGE-005～EDGE-009、NFR-001、NFR-005～NFR-009、AC-001、AC-007。
- Red：新增 inference 契约/状态机/受管路径/Worker 故障测试并确认因实现缺失失败。
- Green：实现固定协议版本、严格解析、合法状态转换、取消/退出、资源清单与安全恢复。
- Refactor：只提取可复用的纯策略和端口类型。
- Validation：inference 目标测试与 core/auth 回归。

### TDD-2：音色与音频

- 关联编号：FR-003～FR-005、FR-014～FR-015、EDGE-001、EDGE-003、EDGE-013～EDGE-014、AC-002～AC-003。
- Red：B 视频边界、授权、原子 CRUD、运行中删除、文案/语速/分段和取消测试。
- Green：实现 voice 服务与 Worker 命令装配，不直接依赖模型仓库。
- Refactor：共享输入摘要和原子索引仅保留在 voice 内。
- Validation：voice 与 inference 回归。

### TDD-3：视频质检、局部生成与输出保护

- 关联编号：FR-006～FR-009、FR-015、EDGE-002～EDGE-006、EDGE-009、NFR-002～NFR-005、NFR-008、AC-004～AC-007、AC-011。
- Red：时长/人物选择/失败区间、嘴部最小区域、输出路径、音轨枚举、缓存键测试。
- Green：实现 video 策略、任务和 Worker/FFmpeg 适配命令。
- Refactor：将纯质检和缓存键从 Electron 装配分离。
- Validation：video、voice、inference 回归。

### TDD-4：封面草稿与双平台发布

- 关联编号：FR-010～FR-015、EDGE-005、EDGE-009～EDGE-012、EDGE-014、NFR-006～NFR-010、AC-008～AC-010。
- Red：三候选、评分、草稿指纹失效、白名单、一次性提交和不确定状态测试。
- Green：实现 publish 草稿、平台适配端口、独立 profile 与显式触发状态机。
- Refactor：平台选择器留在独立适配器，不泄漏到业务层。
- Validation：publish 及全部模块回归。

### TDD-5：统一 setting 窗口与业务权限

- 关联编号：FR-001、EDGE-005、NFR-006、NFR-010、AC-001、AC-012。
- Red：窗口/操作权限矩阵测试证明旧 `talkHero` sender 和单一工作台装配不符合新方案。
- Green：删除独立窗口；按“视频音色”“生成视频”“发布视频”“本地推理”拆分业务路由并复用 `SettingLayout`；全部业务 IPC 仅接受受信 `setting` 窗口。
- Refactor：复用统一页面布局和纯权限策略，不把 voice/video/publish 业务逻辑并入 core。
- Validation：四模块目标测试、core/auth 回归、类型、lint、构建和 macOS 桌面启动。

### TDD-6：受管资源一键安装

- 关联编号：FR-002、EDGE-005～EDGE-008、NFR-005～NFR-009、AC-001、AC-007、AC-012。
- Red：资源安装状态机、固定来源/哈希、磁盘不足、取消、断点复用、原子提交、解压越界与 IPC 参数测试因安装能力缺失失败。
- Green：实现 main 侧固定清单驱动的一键安装会话、分项进度、取消/重试/修复和严格 IPC；系统驱动只检测与引导。
- Refactor：下载/校验/提交端口与 Electron 装配分离，真实清单仍由内置信任锚唯一决定。
- Validation：inference 目标测试、类型/lint/build 和 Windows NVIDIA 真实安装。

### TDD-7：三页工作流、历史预览与发布绑定

- 关联编号：FR-001、FR-003～FR-013、EDGE-005、EDGE-009、EDGE-012、EDGE-015、NFR-005～NFR-010、AC-005、AC-008～AC-010、AC-013。
- Red：菜单/路由断言先证明旧单页只有“视频对口型”“本地推理”；状态、历史完成视频过滤/指纹复验、预览 URL、视频切换确认失效、菜单切换、进行中锁定和迟到响应测试覆盖三页往返风险。
- Green：增加独立 voice/publish 物理路由，把“音色库与文案音频”留在 `/video/workbench` 并恢复独立发布页；生成成功自动选中，历史受管视频可预览并绑定草稿与平台，跨页继续共享文案和操作锁。
- Refactor：renderer 只做流程编排，voice/video/publish main 规则和持久化继续留在原模块。
- Validation：四模块与 core 回归、类型/lint/build、macOS UI 冒烟及 Windows 最终流程。

## 8. 非 TDD 步骤

| 步骤                       | AC                             | 原因                                 | 替代验证                                      |
| -------------------------- | ------------------------------ | ------------------------------------ | --------------------------------------------- |
| 三页视觉与薄装配           | AC-001～AC-010、AC-012～AC-013 | renderer 展示和 config 装配          | 类型、lint、构建、桌面截图/交互               |
| IndexTTS/MuseTalk 实际质量 | AC-002～AC-005                 | 模型与授权素材输出不可由单元测试证明 | Windows NVIDIA 盲听、视频对比、差分与质量记录 |
| GPU 性能与低显存           | AC-011                         | 依赖真实硬件/驱动                    | 6GB/4GB Windows 基准记录                      |
| 双平台真实网页             | AC-009～AC-010                 | 页面和登录/风控依赖真实账号          | 默认停在最终提交前；实际提交需另行明确授权    |
| Windows 安装与退出         | AC-012                         | 平台/打包/进程行为                   | Windows 安装包真实冒烟和进程/日志审计         |

## 9. 分阶段实施

### 阶段 1：底座、资源安装与统一系统界面

- 关联编号：AC-001、AC-007、AC-012～AC-013。实现 inference 协议、环境、一键资源安装、队列/恢复、IPC/preload、统一 `setting` 窗口及“视频音色”/“生成视频”/“发布视频”/“本地推理”菜单装配；用 TDD-1、TDD-5～TDD-7、回归、类型/lint/build 和桌面冒烟验证。

### 阶段 2：视频音色与生成页音频

- 关联编号：AC-002～AC-003、AC-013。独立“视频音色”页实现 B 视频与音色创建/更新，“生成视频”页复用音色库、文案、TTS 与试听；用 TDD-2、TDD-7 验证，真实 IndexTTS 仅在 Windows NVIDIA 运行。

### 阶段 3：生成视频页的 A 视频局部口型与预览

- 关联编号：AC-004～AC-008、AC-011、AC-013。实现 video 质检、人物锁定、局部口型命令、音轨/输出、缓存、质量报告、成功视频历史和受管预览；用 TDD-3、TDD-7 与 Windows 授权素材质量/性能验证。

### 阶段 4：独立发布视频页

- 关联编号：AC-008～AC-010、AC-012～AC-013。在独立“发布视频”页实现历史/当前视频选择与预览、三封面、草稿、平台选择、指纹绑定、受管浏览器和双平台适配器；用 TDD-4、TDD-7、本地 fixture 和真实页面停提交前验证。

## 10. 验证命令

- 目标测试：`pnpm exec vitest run apps/inference apps/voice apps/video apps/publish`
- 相关回归：`pnpm exec vitest run apps/core apps/auth`
- 全部测试：`pnpm test`
- 类型：`pnpm typecheck`
- 静态检查：`pnpm lint`
- 必要构建：`pnpm build`
- 平台检查：Windows 环境执行 `pnpm build:web:win`；当前 macOS 可执行 `pnpm build:web:mac`/桌面冒烟时据实记录。
- CI：不使用

## 11. 真实运行

| AC                             | macOS/Windows 环境              | 操作                                                 | 预期                                   | 证据                                       |
| ------------------------------ | ------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| AC-001、AC-007、AC-012         | macOS 开发环境                  | 工作台启动、Mock Worker 故障/取消、退出              | UI/状态/清理契约成立，不宣称 GPU 支持  | 命令、截图、脱敏日志                       |
| AC-002～AC-007、AC-011～AC-012 | Windows 11 x64 + NVIDIA 4GB/6GB | 安装资源、授权素材音色/视频、OOM/取消/基准、打包退出 | 满足各 AC 或明确失败/受限              | GPU/驱动、耗时、峰值、媒体探测、差分、样片 |
| AC-008                         | macOS 或 Windows                | 生成三封面、编辑并切换视频                           | 候选独立且旧确认失效                   | PNG 与 UI 截图                             |
| AC-009～AC-010                 | Windows 受管浏览器              | 登录、上传、填表并默认停在提交前                     | 白名单、暂停、无重复提交               | 脱敏页面记录；无授权则提交未执行           |
| AC-013                         | macOS UI / Windows 完整环境     | 三页流程、菜单往返、历史切换与延迟任务               | 状态不丢失、不重入，预览与发布绑定一致 | UI 截图/录像、脱敏任务/指纹记录            |

## 12. 独立审查重点

- AC 完整映射、IPC sender/参数/路径、Worker 退出与资源释放、原子持久化、嘴部外画面保护、发布指纹/幂等/域名、敏感日志、平台声明、范围外依赖和隐藏修改。

## 13. 文档更新

- 新建四模块 README；仅在发布/恢复事实落地后更新 `docs/release.md`。core/auth 职责不变。

## 14. 发布与恢复

- 不提交权重、运行时、浏览器 profile 或个人素材；首次资源必须固定来源、版本和哈希后原子安装。
- 源文件永不覆盖；任务/音色写入采用临时目录/文件后提交；运行中/提交中崩溃恢复为安全或不确定状态。
- 默认不 commit、push、merge、删除 worktree/分支或发布。真实平台提交仍需用户针对测试内容另行明确授权。

## 15. 完成映射

| AC             | 实施步骤  | 自动化                           | 真实验证                 |
| -------------- | --------- | -------------------------------- | ------------------------ |
| AC-001         | 阶段 1    | inference 环境/资源/IPC 测试     | Windows 安装/修复        |
| AC-002～AC-003 | 阶段 2    | voice 边界/CRUD/文案/任务测试    | Windows IndexTTS 盲听    |
| AC-004～AC-006 | 阶段 3    | video 质检/区域/输出/音轨测试    | Windows 授权视频对比     |
| AC-007         | 阶段 1、3 | 状态机/取消/崩溃/缓存测试        | Windows OOM/退出         |
| AC-008         | 阶段 4    | publish 封面/文本/指纹测试       | PNG/UI 检查              |
| AC-009～AC-010 | 阶段 4    | 域名/状态/单次提交 fixture 测试  | 真实页面默认停提交前     |
| AC-011         | 阶段 3    | 调度策略测试                     | Windows 4GB/6GB 基准     |
| AC-012         | 全阶段    | 全量门禁和敏感信息测试           | Windows 包/进程/日志冒烟 |
| AC-013         | 全阶段    | 跨页状态/锁定/历史/指纹/延迟回归 | macOS UI / Windows 流程  |

## 16. 执行记录

- 开始时间：2026-09-07 21:05:40 +0800
- 当前阶段：阶段 1 Worker/IPC 底座和阶段 2 音色主链路已接线；阶段 3 仅完成媒体质检并对不安全口型输出 fail-closed；阶段 4 已完成本地草稿持久化/编辑确认和封面接线，平台发布未实现。
- 已完成步骤：Spec/分支/worktree/基线/AP/AC 校验；Plan 生成并确认 Spec；受版本约束的 JSONL Worker、单队列/取消/崩溃处理、一次性文件授权、严格 IPC、受管资源哈希门禁；B 视频音频提取/转写、音色原子创建/试听/重命名/更新/删除、IndexTTS 2.5 有限情绪/语速与原子音频；A 视频媒体质检；三封面、本地文案草稿、revision 编辑防覆盖与确认失效；工作台交互及四模块 README。
- Red/Green 与验证证据：
  - Red 1（2026-09-07）：`pnpm exec vitest run apps/inference/main/contracts.test.ts apps/voice/main/contracts.test.ts apps/video/main/contracts.test.ts apps/publish/main/contracts.test.ts`，4 个 suite 因目标模块不存在正确失败。
  - Green 1：同命令 4 files / 12 tests 通过。
  - Red 2：`pnpm exec vitest run apps/inference/main/task-registry.test.ts apps/voice/main/repository.test.ts`，2 个 suite 因目标模块不存在正确失败。
  - Green 2：模块目标回归 6 files / 16 tests 通过。
  - 全量：最终 `pnpm test`，11 files / 55 tests 通过。
  - 类型：`pnpm typecheck` 通过；首次因生成路由树缺失失败，先由 `pnpm exec electron-vite build` 生成（未手改）后通过。
  - 静态：`pnpm lint` 通过，保留 `apps/core/renderer/routes/config.tsx:80` 一个既有 Prettier warning。
  - 构建：`pnpm build` 通过；仅有 auth store 动态/静态导入的既有 Vite chunk warning。
  - macOS 真实启动：`pnpm start` 成功启动 Electron；无有效本地登录状态时按既有门禁显示微信登录窗口；本地 `localhost:3333` 服务未运行导致二维码请求 `ECONNREFUSED`，未绕过认证进入工作台。
  - Red 3：严格 IPC schema 测试新增后，voice/video/publish 三个 suite 因 parser 不存在各失败 1 项；Green 3：同命令 3 files / 12 tests 通过，renderer 夹带路径、额外字段和未知情绪被拒绝。
  - Python 语法：本机 Python 3.9.6 执行 `python3 -m py_compile apps/inference/worker/worker.py` 仅完成语法编译；真实 Worker 固定拒绝非 3.11 运行时。
  - 最新 inference 目标门禁：6 files / 21 tests 通过；最新全量 `pnpm test`：14 files / 72 tests 通过；`pnpm typecheck`、`pnpm lint`、`pnpm build` 通过（lint 保留 core config 既有 1 个 warning；build 保留 auth store 既有 chunk warning）。
  - Red 4（2026-09-08）：发布草稿 repository 3 项测试因明确 `not implemented` 失败；Green 4：草稿原子持久化、revision 防旧写、编辑确认失效与平台/封面确认门禁通过。
  - Red 5：音色 repository 新增重命名/原子更新测试因明确 `not implemented` 失败；Green 5：旧档案保留、运行中引用保护、重命名和更新产物测试通过。voice/publish/inference/video 最新目标门禁：12 files / 44 tests 通过；`pnpm typecheck`、`pnpm lint`、`pnpm build` 通过（保留上述既有 warning）。
  - 续开发最新门禁（2026-09-08）：四模块 12 files / 45 tests、全量 16 files / 81 tests 通过；`pnpm typecheck`、`pnpm lint`、`pnpm build`、`git diff --check` 通过，仍仅保留 core config 与 auth chunk 既有 warning。
- 审查与修复：第一轮发现 5 项 P1；已修复发布内容指纹/重复授权、嘴部区域安全门禁、音色普通失败回滚与崩溃隔离对账、Windows 11 x64/fail-closed CUDA 判定、资源内置信任锚和符号链接边界。第三轮独立复审确认上述问题均已解决，未发现 P0/P2；完整 Worker/模型/媒体/封面/浏览器能力仍未实现，是唯一剩余 P1，故不声明本地交付完成。
- 非实质性偏差：无。
- 实质变更暂停：IndexTTS 2.5 官方 `pyproject.toml`/`uv.lock` 要求 Python `>=3.10,<3.12`；用户同意将 AP-002 改为受管 Python 3.11，Spec 已退回待确认，等待精确口令后重建并恢复 Plan。
- 恢复执行：用户于 2026-09-07 22:01:14 +0800 重新输入精确口令 `SPEC审核通过`，AP-002 调整获批，Plan 不扩大其他范围并恢复实施。
- 当前未完成且不得误报：受管资源安装/修复及完整来源/哈希/许可证清单；可靠单说话人识别；人物检测/身份锁定/嘴部最小蒙版 MuseTalk 输出、音轨合成、缓存和质量报告；封面人脸避让评分；受管浏览器双平台填表/提交；Windows NVIDIA、4GB/6GB、安装包与真实网页验收。
- 供应链核对（2026-09-07）：IndexTTS 官方代码 HEAD `ee40fa7d6c6b8a2c7f06105f9f1e65775b74868c`，官方 IndexTTS-2.5 权重 revision `c39ce5ba981572cb187443877ff559dfb246ce63`；MuseTalk 官方代码 HEAD `0a89dec45a0192b824e3cf4daf96c239440c5ed8`，官方权重 revision `3ef28bc5cff08c90ad8178a25f1b570cd800170f`。这些 revision 不是完成的安装信任清单；完整逐文件 SHA-256、运行时/辅助模型/FFmpeg/浏览器来源与许可证审计完成前继续 fail-closed。
- MuseTalk 安全结论：官方 1.5 `blending.py` 的默认融合从扩展脸框下半区开始，并非严格嘴部最小邻域；官方 `scripts/inference.py` 还使用单一 bbox/坐标缓存和 shell 字符串命令。TalkHero 不直接采用该输出，需在受管适配器中完成目标人物身份锁定、失败帧回退、嘴部专用 mask 和固定 `execFile` 路径后才可开放视频生成。
- 桌面复验（2026-09-07）：`pnpm start` 构建并启动 Electron，真实窗口停在既有 `/auth/pay` 订阅门禁；未绕过门禁。新增任务日志、媒体协议和模块初始化未造成启动崩溃，但未进入工作台交互。
- 独立审查修复：补齐顶层 frame/可信入口与导航门禁、取消等待终态/超时进程树清理、operation 输出 schema 和业务 finalize 后成功、任务日志原子写入/损坏显式状态/退出 flush、stderr 哈希脱敏、file grant 消费复验、任务轮询/取消及本地封面协议预览；并将任务日志内存变更/回滚/写入串行为单一事务，Windows 终止失败时等待直接子进程、保留未确认退出的句柄并将 Worker 标记为不可复用，进度消息串行持久化，取消中的迟到进度安全忽略。最终独立复审在上述范围未发现剩余或新增 P1/P2。
- 续开发独立审查：已修复 `talkhero-media` Windows 跨卷 junction 穿越；发布准备/确认增加受管视频路径、任务终态及视频/封面重新哈希门禁；音色更新增加崩溃目录对账和最终 mutation 串行。复审仍判定两项 P1：voice 的读取恢复与 mutation 尚未由 repository 内同一队列覆盖，音色引用需由 Set 改为计数；任务日志尚未持久化 operation/output，工作台不能获得可信 videoTaskId。下一轮必须先修复，不声明交付完成。
- Red 6（2026-09-08）：音色并发创建测试暴露索引丢失，引用计数测试暴露同一档案两个并发任务在首个任务结束后被错误视为空闲；任务 operation/output 持久化测试因 `attachOutput` 尚不存在失败。
- Green 6：`VoiceProfileRepository` 统一串行化读取恢复与全部 mutation，档案使用状态改为计数并以一次性 release 释放；档案 create/update 使用独立 revisionId，对 `.creating-*`、`.updating-new-*`、`.updating-old-*` 和未入索引 UUID 目录执行崩溃恢复。任务快照/日志持久化 operation 与受约束的受管 outputRelativePath，renderer 只获得安全 taskId，不暴露内部路径。
- 发布复核修复：选择发布视频时只接受已完成 `video.lipsync` 任务的精确受管输出；prepare/confirm 复验任务、真实路径和视频/封面哈希。重启时遗留 `submitting`/`waiting-user` 草稿恢复为持久化 `uncertain`，工作台明确提示核对平台作品列表并禁用编辑、保存和再次确认，避免重复提交。
- 最终门禁（2026-09-08）：`pnpm test` 17 files / 86 tests 通过；`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；`pnpm lint` 0 error，保留 `apps/core/renderer/routes/config.tsx:80` 既有 1 个 Prettier warning；构建仍仅有 auth store 既有 chunk warning。
- 最终独立窄范围复审：此前报告的音色并发 create P1 已由最新实现和并发产物测试解决并撤回；本轮修复范围未发现新的 P1/P2。产品总体仍处于“执行中（未完成）”，以下未完成能力不因本轮问题修复而改变。
- 品牌与版本调整（2026-09-08）：按用户明确要求将中文显示名统一为“后盾云短视频助手”、英文业务标识统一为 `houdunyun-talkHero`、版本号调整为 `1.0.1`；npm 内部包名因规范使用全小写 `houdunyun-talkhero`。同步更新窗口/UI、应用 ID、可执行文件与安装包名、官网授权标识、更新地址、发布别名及相关文档和测试。发布别名 9 tests、auth 25 tests、全量 17 files / 86 tests 通过；`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；lint 仍为 0 error 和既有 1 warning。
- 配置入口调整（2026-09-08）：按用户明确要求不新增软件配置窗口；详细推理环境与受管资源状态以 `/inference/config` 业务路由复用原系统 `setting` 窗口和 `SettingLayout`，工作台通过系统配置按钮打开该原窗口。Red：配置窗口权限测试因策略函数缺失失败；Green：`setting` 仅获不含任务数据的环境只读权限，任务列表与取消仍仅限 `talkHero` 工作台。全量 17 files / 87 tests、`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；lint 0 error，保留既有 1 warning。macOS `pnpm start` 完成构建并启动 Electron，无窗口/路由启动崩溃；新业务标识尚未在测试服务和更新 CDN 建档，软件详情与 `latest-mac.yml` 均返回 404，受认证门禁限制未完成配置页可视化验收。独立窄范围复审未发现 P0/P1/P2。
- Spec 再确认（2026-09-08 03:30:38 +0800）：用户精确批准将全部业务功能移入原系统 `setting` 窗口并按场景拆分菜单。旧的“仅环境页复用 setting、其他功能保留 talkHero 工作台”实现不再是目标；进入 TDD-5 后统一调整窗口、路由、页面和 IPC 权限。
- TDD-5 Red/Green（2026-09-08）：权限矩阵测试先证明 `setting` 无法访问任务且旧 `talkHero` 仍拥有业务权限；Green 后删除独立 `talkHero` 窗口，以“音色与配音”“视频对口型”“发布管理”“本地推理”四个场景菜单接入原系统 `setting`/`SettingLayout`，全部 inference/voice/video/publish IPC 仅接受受信 `setting` sender，旧窗口身份明确拒绝。
- 菜单切换回归 Red/Green：独立审查发现页面卸载会丢失异步结果和一次性授权上下文；新增 `route-session` 测试先因模块不存在失败。首轮 Green 仅支持重新读取后，复审进一步发现“返回页面后旧异步才完成”不会通知当前实例；订阅测试先以 `session.subscribe is not a function` 正确失败，最终以 `useSyncExternalStore` 接入可订阅窗口会话。第二次复审发现重挂载会把局部 `busy` 重置并允许昂贵请求重入，最终把 `busy/error/notice` 也纳入业务路由会话并增加重挂载锁定测试。音色试听/生成结果、A 视频选材/授权/质检、发布视频/草稿/未保存编辑均能跨菜单切换并接收迟到结果，进行中操作在完成或失败前保持锁定。
- 统一系统配置最终门禁（2026-09-08）：`pnpm test` 18 files / 90 tests 通过；`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；`pnpm lint` 0 error，保留 `apps/core/renderer/routes/config.tsx:80` 既有 1 个 Prettier warning；构建仍仅有 auth store 既有 chunk warning。
- macOS 真实启动复验：清理旧开发实例后执行 `pnpm start`，Electron 完成构建并保持运行，无窗口/路由启动崩溃；官网软件详情 `/api/soft/softs/by-name/houdunyun-talkHero` 与更新 CDN `latest-mac.yml` 仍因新业务标识尚未建档返回 404，认证门禁下未绕过登录进行业务页面可视交互。测试结束后以 Ctrl-C 终止开发实例。
- 发布高风险交互复核：独立审查发现 prepare/update/confirm 等异步请求进行时仍可编辑文案或草稿，旧响应可能覆盖新输入。已让视频选择、文案、标题、简介、话题、平台、封面和操作按钮统一受窗口会话 `busy` 冻结，完成或失败后才恢复编辑。
- 统一系统配置最终独立复审：前三轮依次发现并闭合路由卸载状态丢失、迟到结果订阅、跨路由请求重入和发布请求期间编辑覆盖风险；最终只读复审未发现 P0/P1/P2，结论通过。产品总体未完成能力仍按本节既有清单披露，不因本轮界面整合而视为完成。
- Spec 再确认（2026-09-08 04:29:23 +0800）：用户精确批准一键自动安装应用受管资源，并将音色/文案音频、视频生成与预览、历史视频选择、发布资料和抖音/小红书发布整合到同一“视频对口型”页面；Plan 增补 TDD-6～TDD-7，不新增 Spec 外依赖、权限或迁移。
- TDD-6 Red/Green（2026-09-08）：资源安装测试先因安装器不存在失败；下载进度测试再证明旧下载端口无法报告字节进度。Green 实现固定 HTTPS 清单、许可证/大小/SHA-256 校验、磁盘预检、同卷暂存与原子替换、逐字节总进度、取消/失败清理、重试复用已校验分项及严格零参数 IPC。系统级 NVIDIA 驱动只检测并给出引导；非 Windows 11 x64 或未检测到 NVIDIA 时不启动安装。
- 受管资源发布阻断：正式清单继续为空，因此 UI 显示“清单未就绪”并禁用安装。原因是 Python/依赖、IndexTTS 2.5、MuseTalk 1.5 及辅助模型、ASR、FFmpeg 和受管浏览器尚无本项目发布的不可变逐文件 URL、大小、SHA-256 与许可证集合；上游 revision 不能替代完整信任清单。安装机制已实现，但 AC-001 的真实一键安装仍未完成，必须由发布工程产出并在 Windows NVIDIA 实测后才能开放。
- TDD-7 Red/Green（2026-09-08）：媒体协议测试先证明生成视频 URL 未解析，任务测试先证明输出没有内容指纹，发布契约测试先证明历史视频身份校验缺失。Green 后视频任务在原子提交后持久化输出 SHA-256；历史列表只返回 `completed video.lipsync`、固定 `outputs/video/<taskId>.mp4` 且落盘哈希复验通过的文件；受控媒体协议支持视频 Range 预览，选择历史视频会重新签发一次性发布授权并绑定草稿。
- 单页装配（2026-09-08）：移除独立“音色与配音”“发布管理”菜单及其物理路由，将两个模块的 renderer 内容与视频区域组合进 `/video/workbench`；业务 main、IPC、持久化仍分别保留在 voice/video/publish。生成历史下拉、视频预览、发布文案/三封面、抖音/小红书平台选择与确认均位于同页；真实 MuseTalk 输出和浏览器提交适配器仍未实现，不声明生成或发布端到端完成。
- 本轮自动化门禁（2026-09-08）：首次全量 `pnpm test` 为 19 files / 93 tests 通过；补齐逐字节进度、磁盘预检和复用逻辑后，相关 inference/publish/core 回归 11 files / 42 tests 通过，最终全量为 19 files / 95 tests 通过。`pnpm typecheck`、`git diff --check` 通过；`pnpm lint` 为 0 error，保留 `apps/core/renderer/routes/config.tsx:80` 既有 1 个 Prettier warning。最终 `pnpm build` 通过并生成 82 个 main、19 个 preload、2084 个 renderer 模块，仍仅有 auth store 既有 chunk warning。
- macOS 桌面冒烟（2026-09-08）：`pnpm start` 完成构建并启动 Electron，未发生 main/preload/route 启动崩溃；认证门禁下未绕过登录进入业务页。软件详情 `/api/soft/softs/by-name/houdunyun-talkHero` 与更新 CDN `latest-mac.yml` 仍因新业务标识未建档返回 404；测试后以 Ctrl-C 停止实例。
- 本轮独立审查与修复（2026-09-08）：首轮复审报告 2 项 P1：安装在校验/目录切换阶段的取消与退出恢复不闭合，同页 voice/publish 文案为两个不订阅的局部状态；另报告历史损坏视频未显式展示和安装父目录 symlink/junction 越界风险。修复后 SHA 读取逐块检查取消，提交前后回滚旧目录，退出取消并等待安装会话，启动对账 `.previous-*`/`.installing-*`；安装与资源状态均验证受管根真实路径。当前文案改为 voice 所属的共享可订阅会话；损坏/缺失历史保留为禁选项并给出重新生成原因。新增取消、崩溃恢复、symlink 越界和共享文案订阅回归。
- 审查修复后门禁（2026-09-08）：中间全量 `pnpm test` 20 files / 99 tests、`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；`pnpm lint` 0 error，仅保留 core config 既有 1 warning。继续收紧逐块哈希取消后 inference 8 files / 31 tests 和类型检查通过。
- 最终竞态与恢复闭合（2026-09-08）：第二轮复审发现共享文案未共享操作锁；修复为 voice/publish 计数锁，任一区域运行时两处文案输入和消费者同步冻结。受管根本身为 symlink/junction 时拒绝安装和可用状态；失效生成视频增加确认后移除记录 IPC，main 再次复验仍失败且任务为已完成 `video.lipsync` 后才经原子任务事务删除，不删除其他素材。最终全量 `pnpm test` 20 files / 101 tests、`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；`pnpm lint` 0 error，仅保留既有 1 warning。最终独立只读复审未发现 P0/P1/P2，本轮修复通过；整体产品未完成范围不因此改变。
- 布局变更暂停（2026-09-08 06:34:08 +0800）：用户以截图明确要求“创建或更新音色”进入独立配置页面，“音色库与文案音频”移动到“视频对口型”主标题下。该要求改变 FR-001、AC-002、AC-013 和菜单/路由目标，Spec 已退回待确认；当前未修改 renderer、route 或 menu 代码，等待精确口令后更新 Plan 并实施。
- 最终页面分区澄清（2026-09-08 06:41:14 +0800）：用户进一步以完整截图明确菜单名称与内容：独立“视频音色”放创建/更新音色；“生成视频”同页放音色库/文案音频与 A 视频对口型；独立“发布视频”放生成视频选择、预览、封面文案和平台发布。Spec 已据此重写 FR-001、FR-010～FR-011、AC-002、AC-005、AC-008～AC-010、AC-013 及 Electron 装配目标并保持待确认；代码仍未修改。
- Spec 再确认（2026-09-08 06:47:20 +0800）：用户输入精确口令 `SPEC审核通过`，三页分区与菜单名称获批。Plan 已在不新增依赖、权限、迁移或公共契约的前提下重建 TDD-5、TDD-7、阶段与真实运行映射，并恢复实施。
- 三页装配 Red/Green（2026-09-08）：新增业务菜单回归先以旧“视频对口型”/“本地推理”双菜单正确失败；Green 后菜单按“视频音色”“生成视频”“发布视频”“本地推理”排序，增加 `/voice/config` 与 `/publish/workbench` 路由。“视频音色”独立提供创建及选择已有音色更新，“生成视频”组合音色库/文案音频、A 视频质检并自动预览最新可信生成结果，“发布视频”独立保留可信历史选择、受控预览、封面文案及平台选择；既有共享文案会话、计数锁和各模块 main/IPC/持久化边界不变。
- 三页装配门禁（2026-09-08 07:05:31 +0800）：目标回归 9 files / 33 tests 通过；补充“跳过损坏历史并选择最新可信结果”回归后，全量 `pnpm test` 为 22 files / 103 tests，`pnpm typecheck`、`pnpm build`、`git diff --check` 通过；`pnpm lint` 为 0 error，保留 `apps/core/renderer/routes/config.tsx:80` 既有 1 个 Prettier warning，构建保留 auth store 既有 chunk warning。macOS `pnpm start` 完成构建并启动 Electron，未发生 main/preload/route 启动崩溃；认证门禁下未绕过登录进入三页可视验收，软件详情和更新 CDN 仍因新标识未建档返回 404。
- 本轮复核限制：当前会话没有可复用的独立 reviewer，且执行约束禁止新建子代理，因此仅完成主代理只读 diff 复核，不能把本轮写成“独立审查通过”。产品总体未完成范围仍按本节既有清单披露。
