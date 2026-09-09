# 后盾云短视频助手本地音色、视频对口型与平台发布编码计划

## 0. 文档状态

- 状态：执行中（阶段 0 CosyVoice2 最小资源链审计与探针）
- 状态说明：用户于 2026-09-09 00:53:52 +0800 输入精确口令 `SPEC审核通过`，批准以 CosyVoice2 0.5B 替换 IndexTTS 2.5、淘汰一切需要另行授权或非商用的必需资源，并允许 XPU/MPS 使用明确显示且质量等价的 CPU 音频保底。Plan 已在不扩大其他行为、依赖、权限或公共契约的前提下重建；先固定最小推理链、逐项许可/哈希与 5～10 秒探针，未通过前不开放生产资源下载。

## 1. 基本信息

- feature-slug：local-video-lip-sync
- Spec：`_specs/local-video-lip-sync.md`（已确认）
- 基线：main / a76c991741a68b575c08f611df7f43631e607716
- feature 分支：electron/local-video-lip-sync
- worktree：/Users/hd/code/talkHero-local-video-lip-sync
- 模块归属：`apps/inference`、`apps/voice`、`apps/video`、`apps/publish`
- 范围来源：仅上述 Spec

## 2. 引用清单

- FR-001～FR-017；EDGE-001～EDGE-017；NFR-001～NFR-014；已批准 AP-001～AP-006；AC-001～AC-016；Q-001～Q-006 均已关闭为产品决策或阶段 0/验收/发布门禁。

## 3. 实施原则

- 最小必要修改；不做范围外重构；状态机、IPC、路径、持久化、发布幂等与失败恢复采用风险型 TDD；模型质量、GPU 性能、桌面和真实网页采用真实验收。
- Electron 只编排受管 Worker、媒体工具与浏览器；renderer 只经 preload 使用带版本的结构化协议，不传媒体 Buffer。
- 源媒体只读，生成物原子写入受管目录；未经真实证据不宣称 Windows 模型质量、性能或平台提交通过。
- 阶段 0 先于新增生产推理实现：许可证、固定依赖和三后端关键算子任一无法闭合时，停止对应平台/模型交付并回写 Spec，不用 CPU 或降质路径兜底。

## 4. 影响范围

| 模块或文件                                                                                                                 | 计划变更                                                                               | 对应编号                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/inference/**`                                                                                                        | 三后端能力握手、互斥固定资源包、安全加载、Worker 生命周期、队列/取消/恢复、ASR 时间锚点 | FR-002、FR-005、FR-009、FR-017、EDGE-005～EDGE-009、EDGE-017、NFR-001～NFR-002、NFR-005～NFR-014、AC-001、AC-003、AC-007、AC-011～AC-012、AC-014、AC-016 |
| `apps/voice/**`                                                                                                            | B 视频校验、音色原子 CRUD、TTS 任务装配，并拆出独立音色配置与可复用文案音频内容        | FR-001、FR-003～FR-005、FR-014～FR-015、EDGE-001、EDGE-003、EDGE-013～EDGE-014、AC-002～AC-003、AC-013           |
| `apps/video/**`                                                                                                            | 首版媒体矩阵、主体锁定/跟踪、局部口型、安全音轨、试生成/质量时间轴、字幕草稿/SRT/独立烧录副本与结果变体 | FR-001、FR-006～FR-010、FR-014～FR-017、EDGE-002～EDGE-006、EDGE-009、EDGE-012、EDGE-014～EDGE-017、NFR-002～NFR-005、NFR-008、NFR-011、NFR-014、AC-004～AC-008、AC-011、AC-013～AC-016 |
| `apps/publish/**`                                                                                                          | 干净/字幕变体选择、历史预览、确定性发布文案、三封面、风险确认/草稿指纹与平台状态机     | FR-001、FR-009～FR-017、EDGE-009～EDGE-012、EDGE-014～EDGE-015、EDGE-017、NFR-006～NFR-010、NFR-014、AC-008～AC-010、AC-013、AC-015～AC-016 |
| `config/main.ts`、`config/preload.shared.ts`、`config/routes.ts`、`config/window.ts`、`config/menus.tsx`、`config/dock.ts` | 四模块、bridge、“视频音色”/“生成视频”/“发布视频”/“本地推理”菜单及 `setting` 路由装配   | FR-001、NFR-006、NFR-010、AC-012～AC-013                                                                         |
| `package.json`、锁文件                                                                                                     | AP-001 最小浏览器依赖与 AP-005 受支持 Electron 稳定版升级；不把 Python 模型依赖装入 Node | AP-001、AP-005、FR-011～FR-013、NFR-012、AC-009～AC-010、AC-012 |
| `electron-builder.yml`                                                                                                     | 双平台 Worker 启动装配、签名后资源路径与按平台资源包边界；不打入模型、运行时或个人数据 | FR-002、EDGE-008、NFR-006、NFR-012～NFR-013、AC-012 |
| 四模块 README、`docs/third-party-ai-resources.md`、`docs/release.md`                                                      | 记录职责、SBOM/许可与探针门禁、公共边界、验证及恢复                                    | FR-002、FR-014～FR-017、NFR-009～NFR-014、AP-001～AP-006、AC-001、AC-011～AC-012、AC-014、AC-016                |

## 5. 前置依赖与顺序

1. 先建立受管路径、协议、状态机和 IPC 安全边界，再实现 voice/video/publish，避免业务模块直接接触第三方内部结构（FR-002、NFR-005～NFR-006）。
2. 先完成 AP-002～AP-003、AP-006 的 SBOM/许可结论与 CUDA/XPU/MPS 5～10 秒固定探针；不成立的平台停在不支持状态，不开始其完整模型接线。
3. AP-002～AP-003 只通过不可变版本、逐项 SHA-256 和 Worker 适配边界接入；客户机不执行 `pip install`/`git clone`，权重、运行时和二进制不进入仓库或基础安装包。
4. AP-005 Electron 升级单独完成壳层回归，再接真实 Worker/浏览器；AP-001 浏览器资料按平台隔离，AP-004 的实际提交仍需当前任务中的用户明确点击。

## 6. 风险与验证

| 风险                                   | 等级 | 对应编号                                              | 验证                                                               |
| -------------------------------------- | ---: | ----------------------------------------------------- | ------------------------------------------------------------------ |
| IPC/路径/子进程越权                    |   高 | EDGE-005、NFR-005～NFR-006、AC-001、AC-006、AC-012    | parser、sender、受管路径、固定命令和攻击输入测试                   |
| 状态/持久化错误导致假成功或数据损坏    |   高 | EDGE-008～EDGE-009、EDGE-013、NFR-008、AC-002、AC-007 | 状态转换、原子提交、崩溃恢复、删除失败注入测试                     |
| 修改错误人物或嘴部外画面               |   高 | EDGE-004、NFR-003～NFR-004、AC-004～AC-005            | 策略/坐标/失败区间测试；三后端授权素材差分与人工验收               |
| 发错或重复发布                         |   高 | EDGE-010～EDGE-012、NFR-009、AC-009～AC-010           | 域名、草稿指纹、单次令牌、页面状态 fixture；真实页面默认停在提交前 |
| 供应链、许可、安全加载与签名           |   高 | EDGE-007、NFR-009、NFR-012～NFR-013、AP-002～AP-006、AC-001、AC-012 | SBOM/NOTICE、现有许可文本淘汰门禁、不可变版本/SHA、安全权重加载和签名后启动验证 |
| 三后端算子、显存/共享内存与性能        |   高 | EDGE-006、NFR-001～NFR-002、NFR-011、AC-011、AC-014   | 5～10 秒探针；Y9000P 8GB、Arc B390 32GB、M1+ 16GB 完整基准与跨平台盲看 |
| 双重人声、媒体规格与字幕错配           |   高 | EDGE-002～EDGE-004、EDGE-016～EDGE-017、NFR-003～NFR-004、NFR-014、AC-004～AC-006、AC-016 | 媒体矩阵、人声门禁、原文/时间轴/字体/指纹测试和双平台实际输出检查 |
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

- 关联编号：FR-006～FR-009、FR-014～FR-016、EDGE-002～EDGE-006、EDGE-009、EDGE-016、NFR-002～NFR-005、NFR-008、NFR-011、AC-004～AC-007、AC-011、AC-014～AC-015。
- Red：媒体矩阵、主体确认/身份锁定、失败区间、嘴部最小区域、安全音轨、短音频静止口型、试生成/风险确认、输出变体和缓存键测试。
- Green：实现 video 策略、人物跟踪/质量契约、Worker/FFmpeg 适配命令、试生成、质量时间轴和风险终态。
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
- Validation：inference 目标测试、类型/lint/build 和 CUDA/XPU/MPS 匹配资源包真实安装。

### TDD-7：三页工作流、历史预览与发布绑定

- 关联编号：FR-001、FR-003～FR-013、EDGE-005、EDGE-009、EDGE-012、EDGE-015、NFR-005～NFR-010、AC-005、AC-008～AC-010、AC-013。
- Red：菜单/路由断言先证明旧单页只有“视频对口型”“本地推理”；状态、历史完成视频过滤/指纹复验、预览 URL、视频切换确认失效、菜单切换、进行中锁定和迟到响应测试覆盖三页往返风险。
- Green：增加独立 voice/publish 物理路由，把“音色库与文案音频”留在 `/video/workbench` 并恢复独立发布页；生成成功自动选中，历史受管视频可预览并绑定草稿与平台，跨页继续共享文案和操作锁。
- Refactor：renderer 只做流程编排，voice/video/publish main 规则和持久化继续留在原模块。
- Validation：四模块与 core 回归、类型/lint/build、macOS UI 冒烟及 Windows 最终流程。

### TDD-8：三后端能力、固定资源和供应链门禁

- 关联编号：FR-002、FR-005、FR-007、EDGE-006～EDGE-008、NFR-001～NFR-002、NFR-006、NFR-010～NFR-013、AP-002～AP-003、AP-006、AC-001、AC-003、AC-005、AC-011～AC-012、AC-014。
- Red：CUDA/XPU/MPS 能力握手、互斥清单、内存门槛、模型/算子探针、可变 URL、非固定哈希、客户机安装命令和不安全权重测试先因现实现只支持 CUDA/空清单而失败。
- Green：实现平台判别与 fail-closed 资源契约、固定信任清单格式、安全加载策略和探针命令；真实资源只有许可、来源、大小与哈希齐全后才启用。
- Refactor：平台差异留在 inference adapter/manifest，不渗透 voice/video 业务规则。
- Validation：inference 目标回归；三类真机固定探针，缺失设备据实阻断对应正式支持。

### TDD-9：基础字幕与发布变体绑定

- 关联编号：FR-010、FR-012、FR-017、EDGE-005、EDGE-009、EDGE-012、EDGE-014、EDGE-017、NFR-003、NFR-005、NFR-007～NFR-010、NFR-014、AP-003、AC-008、AC-010、AC-013、AC-016。
- Red：原文不被识别改写、用户编辑版本、低置信/时间重叠/越界、UTF-8 SRT、受管字体、烧录失败保留、干净/字幕指纹失效和发布错绑测试。
- Green：实现字幕草稿/确认仓储、本地时间锚点适配、SRT 导出、受控 libass 烧录和任务输出变体选择。
- Refactor：字幕业务留在 video，publish 只消费已复验的输出变体和指纹。
- Validation：video/publish/inference 目标回归及 Windows/macOS 字体、播放器、网络拦截真实检查。

### TDD-10：受支持 Electron 升级回归

- 关联编号：FR-001～FR-002、EDGE-005、EDGE-008～EDGE-009、NFR-005～NFR-006、NFR-012～NFR-013、AP-005、AC-001、AC-012～AC-013。
- Red：先固定升级后仍必须成立的窗口、sender/IPC、媒体 Range、退出清理、资源路径和构建契约；不为版本号本身制造脆弱断言。
- Green：升级到实施时 Electron 官方仍维护的成熟稳定大版本并完成必要兼容修改。
- Refactor：无版本兼容双分支，只保留新版本实现。
- Validation：全量测试、类型/lint/build、Windows/macOS 平台包和真实安装/启动/退出。

## 8. 非 TDD 步骤

| 步骤                       | AC                             | 原因                                 | 替代验证                                      |
| -------------------------- | ------------------------------ | ------------------------------------ | --------------------------------------------- |
| 三页视觉与薄装配           | AC-001～AC-010、AC-012～AC-013、AC-015～AC-016 | renderer 展示和 config 装配          | 类型、lint、构建、桌面截图/交互               |
| CosyVoice2/MuseTalk 实际质量 | AC-002～AC-005、AC-014       | 模型与授权素材输出不可由单元测试证明 | CUDA/XPU/MPS/显式 CPU 音频盲听、视频对比、差分与质量记录 |
| 双平台真实网页             | AC-009～AC-010                 | 页面和登录/风控依赖真实账号          | 默认停在最终提交前；实际提交需另行明确授权    |
| 三平台性能与资源压力       | AC-011、AC-014                 | 依赖真实硬件/驱动                    | Y9000P 8GB、Arc B390 32GB、M1+ 16GB 完整基准 |
| 双平台字幕视觉             | AC-016                         | 字体栅格化和播放器表现不能由单测证明 | Windows/macOS 同一字幕样片截图、SRT 播放与网络拦截 |
| 双平台安装、签名后启动与退出 | AC-012                       | 平台/签名/打包/进程行为              | Windows/macOS 安装包真实冒烟和进程/日志审计   |

## 9. 分阶段实施

### 阶段 0：商业许可与三后端可行性门

- 关联编号：AC-001、AC-003、AC-005、AC-011～AC-012、AC-014、AC-016。先产出 SBOM/许可与资源来源结论，再以固定 5～10 秒授权素材执行 CUDA/XPU/MPS 关键模型、ASR、字幕和媒体探针；任何未闭合项停止对应交付并回写 Spec，不进入完整实现。

### 阶段 1：底座、资源安装与统一系统界面

- 关联编号：AC-001、AC-007、AC-012～AC-013。实现 inference 协议、环境、一键资源安装、队列/恢复、IPC/preload、统一 `setting` 窗口及“视频音色”/“生成视频”/“发布视频”/“本地推理”菜单装配；用 TDD-1、TDD-5～TDD-7、回归、类型/lint/build 和桌面冒烟验证。

### 阶段 2：视频音色与生成页音频

- 关联编号：AC-002～AC-003、AC-013～AC-014。独立“视频音色”页实现 B 视频与音色创建/更新，“生成视频”页复用音色库、文案、TTS 与试听；用 TDD-2、TDD-7 验证，真实 CosyVoice2 只在阶段 0 已通过的 CUDA/XPU/MPS 或明确 CPU 音频后端开放。

### 阶段 3：生成视频页的 A 视频局部口型、质量与字幕

- 关联编号：AC-004～AC-008、AC-011、AC-013～AC-016。实现首版媒体矩阵、人物锁定、局部口型、安全音轨、试生成/质量时间轴、字幕编辑/SRT/独立烧录副本、成功视频变体历史和受管预览；用 TDD-3、TDD-7～TDD-9 与三后端授权素材质量/性能验证。

### 阶段 4：独立发布视频页

- 关联编号：AC-008～AC-010、AC-012～AC-013。在独立“发布视频”页实现历史/当前视频选择与预览、三封面、草稿、平台选择、指纹绑定、受管浏览器和双平台适配器；用 TDD-4、TDD-7、本地 fixture 和真实页面停提交前验证。

## 10. 验证命令

- 目标测试：`pnpm exec vitest run apps/inference apps/voice apps/video apps/publish`
- 相关回归：`pnpm exec vitest run apps/core apps/auth`
- 全部测试：`pnpm test`
- 类型：`pnpm typecheck`
- 静态检查：`pnpm lint`
- 必要构建：`pnpm build`
- 平台检查：Windows 环境执行 `pnpm build:web:win`；macOS 执行 `pnpm build:web:mac`、`pnpm check:web:mac` 和桌面冒烟；签名、公证与其他真机证据据实记录。
- CI：不使用

## 11. 真实运行

| AC                             | macOS/Windows 环境              | 操作                                                 | 预期                                   | 证据                                       |
| ------------------------------ | ------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| AC-001、AC-007、AC-012         | 当前 macOS Apple Silicon        | 启动、MPS/资源探针、Mock Worker 故障/取消、退出      | UI/状态/清理成立；模型未通过前不宣称完整支持 | 命令、设备信息、截图、脱敏日志          |
| AC-002～AC-007、AC-011～AC-012、AC-014 | Win11 RTX 4060 8GB；Arc B390 32GB；M1+ 16GB | 资源探针、授权素材音色/视频、OOM/取消、1/3 分钟基准、打包退出 | 各平台满足同一质量门禁；RTX 目标 6 分钟、10 分钟 go/no-go | 驱动/版本、耗时、峰值、温度、媒体差分与样片 |
| AC-008                         | macOS 或 Windows                | 生成三封面、编辑并切换视频                           | 候选独立且旧确认失效                   | PNG 与 UI 截图                             |
| AC-009～AC-010                 | Windows 受管浏览器              | 登录、上传、填表并默认停在提交前                     | 白名单、暂停、无重复提交               | 脱敏页面记录；无授权则提交未执行           |
| AC-013                         | macOS UI / Windows 完整环境     | 三页流程、菜单往返、历史切换与延迟任务               | 状态不丢失、不重入，预览与发布绑定一致 | UI 截图/录像、脱敏任务/指纹记录            |
| AC-015～AC-016                 | Windows CUDA/XPU；macOS MPS     | 试生成、风险时间轴、字幕对齐/编辑/SRT/烧录、变体发布复验 | 风险未确认不提交；原文不被自动改写；干净结果不变；无云调用 | UI 录像、SRT、双平台画面、指纹与网络记录 |

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
| AC-001         | 阶段 0～1 | 三后端环境/资源/哈希/IPC 测试    | 三平台安装、探针与修复   |
| AC-002～AC-003 | 阶段 0、2 | voice 边界/CRUD/文案/任务测试    | CosyVoice2 各实际后端盲听 |
| AC-004～AC-006 | 阶段 0、3 | video 媒体/身份/区域/音轨测试    | 三后端授权视频对比       |
| AC-007         | 阶段 1、3 | 状态机/取消/崩溃/缓存测试        | 三平台 OOM/退出          |
| AC-008         | 阶段 4    | publish 封面/文本/指纹测试       | PNG/UI 检查              |
| AC-009～AC-010 | 阶段 4    | 域名/状态/单次提交 fixture 测试  | 真实页面默认停提交前     |
| AC-011         | 阶段 0、3 | 调度/性能记录契约测试            | Y9000P/Arc B390/M1+ 基准 |
| AC-012         | 全阶段    | 全量门禁、供应链与敏感信息测试   | 双平台包/签名/进程/日志冒烟 |
| AC-013         | 全阶段    | 跨页状态/锁定/历史/指纹/延迟回归 | macOS UI / Windows 流程  |
| AC-014         | 阶段 0、3 | 后端契约和同一质量规则测试       | CUDA/XPU/MPS 交叉盲看    |
| AC-015         | 阶段 3～4 | 试生成/风险终态/发布阻断测试     | 三平台风险片段预览       |
| AC-016         | 阶段 0、3～4 | 字幕原文/时间/SRT/变体指纹测试 | Windows/macOS 字幕渲染与无云检查 |

## 16. 执行记录

- 开始时间：2026-09-07 21:05:40 +0800
- 当前阶段：恢复至新增阶段 0 商业许可与三后端可行性门；既有 Worker/IPC、音色仓储、媒体质检、三页流程、历史预览、发布草稿和资源安装框架保留，真实模型、三后端、局部口型、质量时间轴、基础字幕和平台提交仍未完成。
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
- 当前未完成且不得误报：CosyVoice2/MuseTalk 最小链完整 SBOM、许可文本结论与逐文件资源清单；CUDA/XPU/MPS/显式 CPU 音频关键算子和模型真机探针；可靠单说话人识别；人物检测/身份锁定/嘴部最小蒙版 MuseTalk 输出、安全音轨、缓存、试生成和质量时间轴；基础字幕/SRT/独立烧录副本；封面人脸避让评分；受管浏览器双平台填表/提交；Y9000P、Arc B390 32GB、M1+ 16GB、双平台安装签名与真实网页验收。
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
- 受管资源发布阻断：正式清单继续为空，因此 UI 显示“清单未就绪”并禁用安装。原因是 Python/依赖、CosyVoice2 0.5B、MuseTalk 1.5 及辅助模型、ASR、FFmpeg 和受管浏览器尚无本项目发布的不可变逐文件 URL、大小、SHA-256 与许可证集合；上游 revision 不能替代完整信任清单。安装机制已实现，但 AC-001 的真实一键安装仍未完成，必须由发布工程产出并在 Windows NVIDIA 实测后才能开放。
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
- Spec 再确认与 Plan 重建（2026-09-08 23:58:33 +0800）：用户输入精确口令 `SPEC审核通过`，批准 Windows CUDA、Arc B390 XPU、Apple MPS 三后端候选方案，8GB/32GB/16GB 门槛，RTX 4060 三分钟目标 6 分钟与 10 分钟 go/no-go 线，首版媒体矩阵、安全音轨、同质量试生成/风险时间轴、完全本地基础字幕、不可变资源供应链和受支持 Electron 升级。AP-002～AP-003、AP-005～AP-006 获批；许可、真机、授权素材、资源存储和签名没有被虚构为已具备，而是作为阶段 0/验收/发布硬门禁。Plan 已按 FR-001～FR-017、EDGE-001～EDGE-017、NFR-001～NFR-014、AC-001～AC-016 重建，下一步从阶段 0 开始。
- 阶段 0 初步许可审计（2026-09-09）：新增 `docs/third-party-ai-resources.md`。官方材料确认 IndexTTS 2.5 使用自定义 bilibili Model Use License，包含下游条款、许可副本/版权保留、规模门槛与第三方权重责任，官方同时要求商业合作联系 `indexspeech@bilibili.com`；模型卡明确辅助模型首次另行下载，不能直接用于本项目客户机运行时拼装。MuseTalk 官方声明代码 MIT、主模型可商用，但要求逐项遵守 VAE/Whisper/DWPose/face parsing/face alignment/S3FD 等许可，官方互联网 testdata 不可商用，其中汇总 LICENSE 的 S3FD 条目未给出明确许可。FFmpeg/libass、字体、Python、Playwright/Chromium 和三套 PyTorch 包仍需完整 SBOM。阶段 0 因 IndexTTS 商业客户端分发和辅助权重书面/法务结论未关闭而暂停模型接入；文档内已提供联系权利方的邮件模板。本轮未下载或执行模型、未运行代码测试。
- 阶段 0 固定源码审计（2026-09-09）：只读检查 IndexTTS 提交 `ee40fa7d6c6b8a2c7f06105f9f1e65775b74868c` 与 MuseTalk 提交 `0a89dec45a0192b824e3cf4daf96c239440c5ed8`，未下载或执行权重。IndexTTS 缺资源时会从未固定 revision/`main` 下载 W2V-BERT、MaskGCT semantic codec、CAMPPlus 和 BigVGAN，并接触用户默认 HF 缓存；主/辅助权重多为 pickle 容器且调用点未显式写出 `weights_only=True`，但上游固定 PyTorch 2.8 的默认值已是受限加载，故结论是必须强制并逐文件验证，而不是误报已存在任意代码执行。BigVGAN 可在客户机运行时编译 CUDA kernel。更关键的是其实际所需 `amphion/MaskGCT` 模型仓库标注 CC-BY-NC-4.0，收费商业产品在取得独立授权或可商用等价替代前被阻断。MuseTalk 官方脚本同样包含可变下载、Google Drive/独立 URL、缺权重自动下载、多处隐含默认的 `torch.load` 与 `os.system` FFmpeg 拼接；TalkHero 必须只复用经适配的模型代码，禁止运行时下载/编译，使用应用受管目录、固定哈希、PyTorch 2.6+ 强制受限加载/安全权重格式和参数数组进程调用。MuseTalk 的 S3FD、BiSeNet 权重许可链及 OpenRAIL++ SyncNet 义务仍待关闭。邮件模板已增加 MaskGCT 商业授权的明确询问；阶段 0 继续保持关闭。
- 阶段 0 依赖收缩与平台依据（2026-09-09）：MuseTalk 固定源码确认 LatentSync SyncNet 只参与训练/评分，不列入首版生成运行包；S3FD/BiSeNet 因许可链不清和蒙版范围不符，优先以已必需的 DWPose 面部关键点实现保守人脸框、嘴部多边形和 fail-closed 跟踪探针，只有授权样片验证不达标时再讨论经许可替代。PyTorch 官方已将 Windows 11 + Core Ultra Mobile Series 3（Panther Lake）列入 XPU 验证硬件，说明 Arc B390 有框架级探针基础，但不代表 IndexTTS/MuseTalk 已兼容。当前 Electron `39.2.6` 已结束支持；截至当日阶段 1 候选为稳定 `44.2.0`，Electron 45 仍为预发布，不采用。以上结论不关闭 MaskGCT 商业授权、三后端模型实测和逐文件清单门禁。
- 阶段 0 TTS 备选预研（2026-09-09）：仅以官方仓库/模型卡建立未批准候选，未下载或运行模型。CosyVoice2 0.5B 标注 Apache-2.0 且官方协作者公开确认模型可商用，作为质量优先备选；OpenVoice V2 的代码/权重标注 MIT 并明确免费商用，作为资源较轻备选。两者均未完成传递依赖、三后端、音质和性能验证，不替代已批准的 IndexTTS 2.5。只有 IndexTTS/MaskGCT 授权被否定、长期无法关闭或条件不可接受时，才退回 Spec 让用户选择并以同一授权样本盲听决策。
- 阶段 0 媒体/字幕资源预选（2026-09-09）：首版字幕字体候选为未修改的 Noto Sans CJK SC Regular OTF，官方采用 SIL OFL 1.1，可随软件嵌入/再分发并附带许可；尚待固定文件 revision/大小/SHA-256 和双平台 libass 验证。FFmpeg 候选保持 LGPL 边界，不启用 GPL `libx264`；按平台探针 `h264_nvenc`、`h264_qsv`、`h264_videotoolbox`，硬件编码缺失时 fail-closed，不静默切换未经审计的软件编码器。
- 默认 TTS 方案变更暂停（2026-09-09 00:43:19 +0800）：用户拒绝任何依赖联系权利方、等待额外授权的交付方式，要求只使用开源、无模型/API 授权费且许可证文本直接允许商用的方案。经固定源码预审，Spec 拟以 CosyVoice2 0.5B 替换 IndexTTS 2.5：主代码/模型卡为 Apache-2.0，Matcha-TTS 为 MIT，WeTextProcessing 为 Apache-2.0；明确排除 ttsfrd、vLLM、TensorRT、训练/服务端和未审计可选依赖。上游只直接实现 CUDA/CPU，因此同时拟批准 XPU/MPS 不可用时可见、质量等价的 CPU 音频保底，MuseTalk 视频仍禁止纯 CPU 保底。该变更影响 FR-005、EDGE-006、AP-002～AP-003、AP-006、阶段 0、AC-002～AC-003、AC-011 与 AC-014，Spec 已退回待确认；未修改源代码、未下载或执行模型。
- Spec 再确认与 Plan 重建（2026-09-09 00:53:52 +0800）：用户输入精确口令 `SPEC审核通过`，批准 CosyVoice2 0.5B 默认 TTS、直接商用许可淘汰门禁以及 XPU/MPS 的可见 CPU 音频保底；AP-002、AP-003、AP-006 恢复已批准。Plan 将阶段 0 的音频对象、供应链验证、真实盲听和后端记录替换为 CosyVoice2，不扩大视频、平台、权限、数据或发布范围；实施从固定最小资源链和安全探针恢复。
