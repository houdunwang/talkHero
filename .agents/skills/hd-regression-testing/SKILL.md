---
name: hd-regression-testing
description: 为后盾云桌面助手设计、审计或执行风险驱动的回归与验收验证，连接 Spec AC、改动 diff、Vitest、本地门禁和真实桌面环境；不用于普通功能实现或仅运行一个已明确命令。
---
<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云回归测试

支持三种模式：审计现有覆盖、设计最小回归集合、按明确授权执行测试。只要求计划或审计时保持只读；执行时可以运行安全的现有命令，但默认不修业务代码、不改 Spec/Plan、不提交、不推送、不发布。新增测试或修复缺陷需用户或已确认 Spec 的实施授权。

先读取 `../../../AGENTS.md`、`../../../docs/testing.md`、相关已确认 Spec/Plan、模块 README、相对基线 diff 和测试配置，建立“AC/行为—风险—验证”表。优先覆盖被修改行为、直接依赖、跨进程装配、历史 Bug、高影响失败和用户可观察结果，选择最少但高价值的测试，不以覆盖率或穷举矩阵为目标。

项目使用 Vitest Node 环境，测试位于 `apps/**/*.test.ts`，另有 `scripts/create-release-aliases.test.cjs`。目标测试使用 `pnpm exec vitest run <test-file-or-directory>`，全量使用 `pnpm test`，本地门禁按风险补 `pnpm typecheck`、`pnpm lint` 与必要 `pnpm build`。装配或平台包按需使用 `pnpm build:web:win`、`pnpm build:web:mac`、`pnpm check:web:mac`。本项目不使用 CI。

风险路由：

- 认证/支付优先契约、流程、错误映射、会话与隔离服务；不得使用生产凭据或真实支付。
- store、文件、图片协议、录制会话优先损坏写保护、原子性、生命周期与失败保留。
- IPC/窗口/快捷键优先 sender/窗口/参数策略、原子替换、装配和销毁清理。
- recorder、camera、sleep、window-layout 的权限、媒体、原生 addon、PowerShell/User32、多显示器/DPI、系统资源与安装行为必须补 macOS 15+ arm64 或 Windows 11 x64 真实运行。

Bug 或适合自动化的高风险行为保留有效 Red → Green：Red 必须因目标缺失或旧 Bug 正确失败，环境错误、坏 fixture 或编译错误不算；不得弱化、跳过或过度 Mock。自动化、构建门禁和真实运行分别记录，Mock、测试服务与真实服务不得混称。

输出每个重要 AC/风险的命令、环境、结果与失败分类；未执行项标明原因和剩余风险。发现缺陷时给复现条件、关联 AC、影响和证据，不擅自修复。结论为通过、失败、阻塞或仅审计，不承诺零 Bug。
