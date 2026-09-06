---
name: hd-module-doc-maintainer
description: 创建、更新或只读审计后盾云桌面助手 apps 模块 README，在模块职责、入口、IPC、持久化、平台或验证边界变化时维护长期知识；不用于普通代码实现或全局文档生成。
---
<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云模块文档维护

默认只修改用户指定或当前功能实质影响的 `apps/<module>/README.md`；只要求审计时保持只读。普通内部重构、临时文件列表和显而易见的函数说明不触发更新，也不批量重写全部模块。

先完整读取 `../../../AGENTS.md`、`../../../docs/ai-development.md`、`../../../docs/testing.md`、目标 README、相关 Spec/Plan、模块入口、公共类型、main/preload/renderer 边界、store/文件/权限、测试，以及 `config/main.ts`、`config/preload.shared.ts`、`config/preload.ts`、`config/routes.ts`、`config/window.ts`、`config/tray.ts`、`config/menus.tsx` 中的实际装配。

只以代码和配置证明长期事实，保留仍准确内容。README 按需覆盖：职责与非职责、少量关键入口、主流程、公共 IPC/bridge/route、状态与持久化、外部和系统边界、macOS/Windows 差异、显式装配、目标测试与真实验证、相关真实文档和维护触发条件。命令必须来自 `package.json` 或项目文档；通用测试规则链接 `../../docs/testing.md`，不复制全文。不得写功能 Spec、实施历史、未交付计划、密钥或个人数据。

修改后静态检查路径、接口、命令、平台与相对链接；输出更新原因、关键事实、未确认项和其他需要同步的事实文档。默认不修改代码、测试、Git、发布或部署。
