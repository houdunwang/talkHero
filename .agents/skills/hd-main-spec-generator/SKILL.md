---
name: hd-main-spec-generator
description: 仅当用户明确要求直接在 main 开发时，为后盾云桌面助手在现有 clean main 工作区完成 Spec、Plan、风险型 TDD、实现、验证和独立审查，全程不创建或切换 branch/worktree；需要隔离时使用 hd-spec-generator。
---
<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云 Main 工作区功能交付

先读 [项目画像](references/project-profile.md)。本 Skill 只用于用户明确选择 main 模式；与 `hd-spec-generator` 的 feature worktree 模式互斥，一次交付不得混用。

```text
阶段 A：确认当前是 clean main 根工作区 → 锁定完整 HEAD
       → 只在当前工作区生成待确认 Spec → 停止
阶段 B：用户在同一工作区输入精确口令 SPEC审核通过
       → 校验 HEAD/状态 → 内存生成并校验 Plan → 写入 Plan、确认 Spec
       → 风险型 TDD → 实现 → 本地门禁 → 真实运行 → 独立审查 → 交付
```

全程禁止创建、切换、合并、rebase 或删除 branch/worktree，也禁止 stash、reset、checkout、clean；默认不 commit、push 或发布。只有 Spec 是人工审核点，Plan 不扩大 Spec 时无需审核。

## 写作方式

- 与用户沟通先说结论，再用日常中文说明原因、风险和下一步；少用术语，必须用时顺手解释。不要把流程规则原样堆给用户。
- Spec 和 Plan 只写这项需求相关、会影响决定或验证的事实；同一事实只保留一处，能用一行或表格说清就不写长段落。
- 模板章节按需保留；不适用内容合并写“无/不涉及”，不要为填满模板重复背景、范围或验证信息。编号、范围、验收条件、风险和证据必须完整、可追溯。

## 路由

- 新功能：读取 [phase-a-main.md](references/phase-a-main.md) 和 [spec-template.md](spec-template.md)。阶段 A 开始时逐文件 Git 状态必须完全为空；只创建 `_specs/<slug>.md`，随后停止且不运行项目命令。
- 初次批准：读取 [approval-main.md](references/approval-main.md) 和 [plan-template.md](plan-template.md)。只有在 Spec 记录的当前 main 根工作区输入完全一致的 `SPEC审核通过` 才有效。
- 已有活动 Spec/Plan、实施改动或用户要求继续：读取 [resume-main.md](references/resume-main.md)，不得因 dirty 状态回到阶段 A。
- Plan 校验不扩大 Spec 后：读取 [delivery-workflow.md](references/delivery-workflow.md)。

Spec 使用 `FR-* / EDGE-* / NFR-* / AP-* / AC-* / Q-*`，每个 AC 至少关联 FR、EDGE 或 NFR。关键 Q 未关闭、需实施 AP 未批准或 Plan 新增行为、依赖、迁移、权限、公共契约时停止并退回 Spec 审核。

批准后默认授权当前 main 工作区内的范围内代码/测试、已批准依赖、安全本地验证、真实运行、独立只读审查、P0/P1 与有证据的重要 P2 修复、必要模块 README 更新。默认不授权 commit、push、发布、生产写入、真实支付或范围外变化。

只有重要 AC 有证据、适用 Red/Green 有正确失败与通过记录、目标测试/回归/类型/lint/必要构建通过、关键真实运行完成或限制披露、独立审查无未解决 P0/P1、文档一致且无隐藏范围外改动时，才能声明“本地交付完成”。本项目不使用 CI。
