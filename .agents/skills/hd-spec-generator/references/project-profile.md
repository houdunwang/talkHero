<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云桌面助手项目画像

- 根目录：由 `git rev-parse --show-toplevel` 识别并用物理路径规范化；当前安装目标为 `/Users/hd/code/electron`。基线分支为 `main`。
- 分支：把仓库名规范化为 `electron`，feature 分支为 `electron/<feature-slug>`；同级 worktree 使用不位于现有 worktree 内的绝对路径。新 worktree 只包含锁定的 `main` HEAD，不继承 main 未提交改动。
- 栈：Electron 39、TypeScript、React 19、electron-vite、TanStack Router、Tailwind CSS、pnpm 11、Vitest。
- 边界：`src/main/`、`src/preload/`、`src/renderer/`；稳定业务模块在 `apps/`，显式装配在 `config/main.ts`、`config/preload.shared.ts`、`config/preload.ts`、`config/routes.ts`、`config/window.ts`、`config/tray.ts`、`config/menus.tsx`。
- 平台：macOS 15+ Apple Silicon、Windows 11 x64；`apps/window-layout` 不支持 Linux。
- 文档：Spec 在 `_specs/`，Plan 在 `_plans/`，模块知识在 `apps/*/README.md`。不采用 PRD 流程。
- 测试：`pnpm exec vitest run <test-file-or-directory>`；全量 `pnpm test`；类型 `pnpm typecheck`；静态检查 `pnpm lint`。没有单一 `verify`，本地等价门禁按风险组合这些命令。
- 构建/运行：`pnpm build`、`pnpm dev`、`pnpm start`；平台包 `pnpm build:web:win`、`pnpm build:web:mac`，macOS 检查 `pnpm check:web:mac`。
- 高风险：IPC sender/窗口/参数，认证、支付、授权码、网络，store/文件，媒体与系统权限，全局 Hook，原生 addon，PowerShell worker，多显示器/DPI，签名和自动更新。
- 禁止：手改 `src/renderer/routeTree.gen.ts`、`out/`、`dist/`、`.tanstack/`、`.electron/`、原生产物、凭据与签名材料；不要默认运行全仓 `pnpm format`。
- 辅助 Skills：`hd-regression-testing` 选择高价值回归；`hd-module-doc-maintainer` 仅在模块知识实质变化时更新 README；独立上下文使用 `hd-code-review`。
- CI：不使用，纯本地门禁为完整模式。

若本画像与 `../../../../AGENTS.md` 冲突，以后者为准并报告画像需更新。
