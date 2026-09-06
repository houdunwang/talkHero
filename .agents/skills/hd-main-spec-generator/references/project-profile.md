<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云桌面助手 Main 模式项目画像

- 根目录：由 `git rev-parse --show-toplevel` 识别并以物理路径规范化；安装目标为 `/Users/hd/code/electron`。主分支为 `main`，必须留在其现有根工作区。
- 栈：Electron 39、TypeScript、React 19、electron-vite、TanStack Router、Tailwind CSS、pnpm 11、Vitest。
- 边界：`src/main/`、`src/preload/`、`src/renderer/`；稳定模块在 `apps/`；显式装配在 `config/main.ts`、`config/preload.shared.ts`、`config/preload.ts`、`config/routes.ts`、`config/window.ts`、`config/tray.ts`、`config/menus.tsx`。
- 平台：macOS 15+ Apple Silicon、Windows 11 x64；`apps/window-layout` 不支持 Linux。
- 文档：Spec `_specs/`，Plan `_plans/`，模块 README `apps/*/README.md`；不采用 PRD。
- 命令：目标测试 `pnpm exec vitest run <path>`，全量 `pnpm test`，类型 `pnpm typecheck`，lint `pnpm lint`；构建/运行 `pnpm build`、`pnpm dev`、`pnpm start`；平台包 `pnpm build:web:win`、`pnpm build:web:mac`，macOS 检查 `pnpm check:web:mac`。没有单一 `verify`。
- 高风险：IPC、认证/支付/授权码、网络、store/文件、媒体和系统权限、全局 Hook、原生 addon、PowerShell worker、多显示器/DPI、签名与自动更新。
- 禁止：手改生成文件与输出目录，不触碰凭据/签名材料，不默认运行全仓 `pnpm format`。
- 辅助 Skills：`hd-regression-testing`、`hd-module-doc-maintainer`、独立上下文中的 `hd-code-review`。
- CI：不使用。

与 `../../../../AGENTS.md` 冲突时以后者为准并报告画像需更新。
