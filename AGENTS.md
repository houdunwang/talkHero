<!-- managed-by: hd-sdd-tdd-setup -->
# 项目代理规则

## 项目概览

TalkHero 是基于后盾云桌面助手脚手架开发的本地 AI 视频对口型工具，由 Electron 39、TypeScript、React 19、electron-vite、TanStack Router 与 Tailwind CSS 构成，使用 pnpm 11。用户先从 B 视频创建可复用的本地音色档案，再以该音色和独立文案生成音频，最后只修改 A 视频人物的嘴部口型；产品还负责本地生成发布文案与封面，并在用户明确触发后自动操作抖音、小红书发布页面。产品行为以根目录 [PRD](PRD.md) 和已确认 Spec 为准。

主进程入口为 `src/main/index.ts`，renderer 入口为 `src/renderer/main.tsx`，共享装配在 `config/`，稳定功能边界在 `apps/`；编译输出为 `out/`，安装包输出为 `dist/`。桌面壳支持 macOS 15+ Apple Silicon 和 Windows 11 x64；首版完整本地 AI 推理以 Windows 11 x64 + NVIDIA CUDA 为目标平台，其他平台能力不得在未经真实验证时宣称等价支持。

## 优先级与开发原则

代理与用户是共同为产品结果负责的协作者，不以机械服从为目标。面对需求、假设、技术判断或实施方案时必须独立分析；发现信息不可靠、目标互相冲突、方案代价失衡、存在更优路径或可能损害质量、安全、隐私、可维护性与交付结果时，应明确提出异议，说明事实、证据、风险和可选方案，并与用户讨论后收敛到更好的决策。不得为了迎合用户而把猜测表述为事实、隐瞒关键代价或执行明知不合理的方案，也不得把讨论中的设想直接视为最终实施指令。用户在了解取舍后作出的明确决定，只要不违反安全和项目硬边界，应作为后续工作的依据。

冲突时依次服从：用户当前明确要求、本文、已确认 `_specs/*.md`、模块 README、`_plans/*.md`、AI 推断。Spec 定义行为，但不能覆盖本文的安全、平台、架构、文件边界和验证硬规则；冲突会改变行为、数据、安全、权限、发布或范围时必须停止确认。

只实现当前需求的最小范围，保留无关本地修改，不夹带重构或未来抽象。不得为了测试通过而弱化 Spec、断言或门禁。新增 `if`、`try/catch`、fallback、重试、默认值或兼容分支必须有 Spec、契约、失败测试、历史 Bug 或真实运行证据；`catch` 不得静默吞错。本项目默认只面向当前版本，不新增旧版本迁移或遗留格式兜底，除非用户明确要求。新增或职责实质变化的源码应有简短职责说明；只为非直观逻辑注释原因和约束，避免噪声注释。

## 架构、安全与平台边界

- `src/main/` 启动 Electron；`src/preload/` 与 `apps/*/preload/` 只暴露最小 bridge；`src/renderer/` 不得直接访问 Node 或系统能力。
- `apps/<module>/` 是稳定功能边界，修改前先读其 README。`apps/core` 提供窗口、store、权限、网络、Tray 与更新等共享基础设施；业务规则和状态留在业务模块。
- 对口型产品新增能力按四个模块收口：`apps/inference` 管理本地 Python Worker、模型、GPU 与任务调度；`apps/voice` 管理 B 视频预处理、音色档案和文案转音频；`apps/video` 管理 A 视频质检、人脸跟踪、局部口型生成与合成；`apps/publish` 管理标题、简介、话题、封面和平台发布自动化。不得把这些业务能力并入 `apps/core`，也不得把 ASR、FFmpeg、封面或单个平台过早拆成独立 app。
- Electron 负责 UI、受控文件访问、任务编排与发布自动化，AI 模型必须运行在独立本地 Python Worker 中。renderer 不得直接启动进程、访问模型或执行 FFmpeg；main 只能通过有版本的结构化协议调用 Worker，并负责健康检查、超时、取消、崩溃恢复、资源释放和错误透传。
- 首版默认模型为 IndexTTS 2.5（音色与语音）和 MuseTalk 1.5（口型），FFmpeg 负责音视频处理。模型实现必须位于 `apps/inference` 的适配边界之后，业务模块不得依赖模型仓库的内部文件布局；模型替换、量化或新增高清模式必须先由 Spec 定义行为、资源与许可证影响。
- A 视频处理只允许重绘嘴部及实现自然融合所必需的最小邻域。人脸裁剪、对齐和低分辨率代理帧只能作为内部计算手段；输出不得未经用户明确选择而裁切、调色、美颜、换脸、补帧、修改背景、身体、动作或其他脸部特征。无法可靠跟踪、侧脸过大、遮挡或模糊时必须显式标记失败片段，不得扩大生成区域掩盖错误。
- B 视频只用于首次创建或更新音色档案。音色档案至少封装经清理的参考音频、自动转写及模型所需特征；后续生成不得要求用户重复上传 B 视频。音色、参考生物特征和中间文件默认只保存在本机，删除与导出必须具有明确边界。
- 发布自动化属于高风险外部写入：必须由用户对本次内容明确点击触发，使用独立受控浏览器资料目录与平台域名白名单，不得读取用户日常浏览器配置、绕过验证码或静默发布。只有平台页面给出可验证成功状态时才能报告发布成功；验证码、扫码、风控、页面变化与审核拒绝必须暂停或失败并保留可恢复的本地素材。
- 新 main、preload、route、window、Tray 或菜单能力必须按需同步 `config/main.ts`、`config/preload.shared.ts`、`config/preload.ts`、`config/routes.ts`、`config/window.ts`、`config/tray.ts`、`config/menus.tsx`，不得只增加孤立实现。
- IPC 必须经 preload；main 负责校验 sender、窗口、权限和参数。路径、URL、文件、持久化键、快捷键、显示器坐标、网络响应和 renderer 输入均不可信。
- 认证、支付、授权码、更新、摄像头/麦克风/辅助功能、全局 Hook、原生 addon、Python/PowerShell worker、模型下载、浏览器自动发布、文件写入与持久化是高风险边界。不得提交凭据、签名材料、授权码、登录资料、音色样本、人物视频或其他个人数据。
- 原生、权限、多显示器/DPI、安装、签名与自动更新行为必须在实际受支持平台验证；Mock、类型检查或构建不能替代真实桌面证据。

## SDD、风险型 TDD 与 Git 模式

中高风险或用户可观察变更必须先有人工确认的 Spec；Plan 只能展开 Spec，不得扩大产品范围、依赖、迁移、权限或公共契约。高风险且适合稳定自动化的行为与 Bug 回归采用有效 Red → Green → Refactor；纯视觉、薄装配、系统权限、硬件、签名和真实第三方行为使用适当真实验证。详见 [AI 开发流程](docs/ai-development.md) 与 [测试策略](docs/testing.md)。

项目提供两个互斥入口，用户必须明确选择且一次交付不得混用：

- `hd-spec-generator`：从 `main` 已提交的精确 `HEAD` 创建独立 feature worktree；main 有普通未提交改动时可以启动，但这些改动不会进入新 worktree，功能依赖它们时必须等待提交。
- `hd-main-spec-generator`：全程在现有 `main` 根工作区，禁止创建或切换 branch/worktree；阶段 A 只能从完全 clean 的 Git 状态开始。

只有 Spec 是实施前人工审核点。用户输入精确口令 `SPEC审核通过` 后，生成不扩大 Spec 的 Plan 并进入实施；Plan 不需要人工审核。功能行为与 AC 写入 `_specs/`，实施记录写入 `_plans/`，模块边界写入模块 README，发布和恢复写入 [发布与回滚](docs/release.md)。

## 命令与本地门禁

- 安装：`pnpm install`
- 目标测试：`pnpm exec vitest run <test-file-or-directory>`；全部测试：`pnpm test`
- 类型检查：`pnpm typecheck`；静态检查：`pnpm lint`
- 开发与预览：`pnpm dev`、`pnpm start`
- 构建：`pnpm build`
- 平台包：`pnpm build:web:win`、`pnpm build:web:mac`；macOS 发布检查：`pnpm check:web:mac`

没有单一 `verify` 命令。本项目采用纯本地模式，不使用 CI；缺少 CI 不是交付缺口。普通业务改动至少执行适用目标测试、相关回归、`pnpm typecheck` 和 `pnpm lint`；涉及装配或打包时运行适用构建；桌面、权限或原生能力必须在相关真实平台运行。未执行项不得写成通过。

## 文档、文件与 Git

模块职责、入口、公共接口、IPC、持久化、平台或验证方式发生实质变化时同步模块 README；低风险局部改动不机械新增文档，也不在多个文档重复维护同一事实。

不要手改 `src/renderer/routeTree.gen.ts`、`out/`、`dist/`、`.tanstack/`、`.electron/`、原生构建产物或其他生成文件。签名、公证、provisionprofile、`build/entitlements.mac.plist`、更新 URL 和发布脚本须谨慎修改。`pnpm format` 会全仓改写，除非明确要求不要运行。默认不提交、推送、合并、删除 worktree、发布或写入生产系统。
