<!-- managed-by: hd-sdd-tdd-setup -->
# 项目代理规则

## 项目概览

后盾云桌面助手是 Electron 39、TypeScript、React 19、electron-vite、TanStack Router 与 Tailwind CSS 构成的桌面效率工具，使用 pnpm 11。主进程入口为 `src/main/index.ts`，renderer 入口为 `src/renderer/main.tsx`，共享装配在 `config/`，稳定功能边界在 `apps/`；编译输出为 `out/`，安装包输出为 `dist/`。支持 macOS 15+ Apple Silicon 和 Windows 11 x64。

## 优先级与开发原则

冲突时依次服从：用户当前明确要求、本文、已确认 `_specs/*.md`、模块 README、`_plans/*.md`、AI 推断。Spec 定义行为，但不能覆盖本文的安全、平台、架构、文件边界和验证硬规则；冲突会改变行为、数据、安全、权限、发布或范围时必须停止确认。

只实现当前需求的最小范围，保留无关本地修改，不夹带重构或未来抽象。不得为了测试通过而弱化 Spec、断言或门禁。新增 `if`、`try/catch`、fallback、重试、默认值或兼容分支必须有 Spec、契约、失败测试、历史 Bug 或真实运行证据；`catch` 不得静默吞错。本项目默认只面向当前版本，不新增旧版本迁移或遗留格式兜底，除非用户明确要求。新增或职责实质变化的源码应有简短职责说明；只为非直观逻辑注释原因和约束，避免噪声注释。

## 架构、安全与平台边界

- `src/main/` 启动 Electron；`src/preload/` 与 `apps/*/preload/` 只暴露最小 bridge；`src/renderer/` 不得直接访问 Node 或系统能力。
- `apps/<module>/` 是稳定功能边界，修改前先读其 README。`apps/core` 提供窗口、store、权限、网络、Tray 与更新等共享基础设施；业务规则和状态留在业务模块。
- 新 main、preload、route、window、Tray 或菜单能力必须按需同步 `config/main.ts`、`config/preload.shared.ts`、`config/preload.ts`、`config/routes.ts`、`config/window.ts`、`config/tray.ts`、`config/menus.tsx`，不得只增加孤立实现。
- IPC 必须经 preload；main 负责校验 sender、窗口、权限和参数。路径、URL、文件、持久化键、快捷键、显示器坐标、网络响应和 renderer 输入均不可信。
- 认证、支付、授权码、更新、摄像头/麦克风/辅助功能、全局 Hook、原生 addon、PowerShell worker、文件写入与持久化是高风险边界。不得提交凭据、签名材料、授权码或个人数据。
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
