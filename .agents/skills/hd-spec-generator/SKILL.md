---
name: hd-spec-generator
description: 为后盾云桌面助手用独立 feature worktree 交付中高风险功能或 Bug：先在新 worktree 生成待确认 Spec，获批后生成受其约束的 Plan，并完成风险型 TDD、实现、验证和独立审查；不用于初始化、纯审查或直接发布。
---
<!-- managed-by: hd-sdd-tdd-setup -->
# 后盾云 Feature Worktree 功能交付

先读 [项目画像](references/project-profile.md)。本 Skill 只用于隔离 worktree 模式；需要直接在现有 `main` 工作区开发时使用 `hd-main-spec-generator`，一次交付不得混用。

## 状态机

```text
阶段 A：锁定 main 的精确 HEAD → 创建 feature worktree → 在其中生成待确认 Spec → 停止
阶段 B：用户在审核 worktree 输入精确口令 SPEC审核通过
       → 校验/必要时同步基线 → 内存生成并校验 Plan → 写入 Plan、确认 Spec
       → 风险型 TDD → 实现 → 本地门禁 → 真实运行 → 独立审查 → 交付
```

只有 Spec 是人工审核点。Plan 不扩大 Spec 时无需人工审核或对话文件传入。新增产品行为、依赖、迁移、权限、公共契约或高风险外部操作必须让 Spec 退回待确认。

## 写作方式

- 与用户沟通先说结论，再用日常中文说明原因、风险和下一步；少用术语，必须用时顺手解释。不要把流程规则原样堆给用户。
- Spec 和 Plan 只写这项需求相关、会影响决定或验证的事实；同一事实只保留一处，能用一行或表格说清就不写长段落。
- 模板章节按需保留；不适用内容合并写“无/不涉及”，不要为填满模板重复背景、范围或验证信息。编号、范围、验收条件、风险和证据必须完整、可追溯。

## 路由

- 新功能阶段 A：完整读取 [phase-a-worktree.md](references/phase-a-worktree.md) 和 [spec-template.md](spec-template.md)。创建 worktree 后才在其中完整分析项目规则、相关 README、代码、测试和配置。只创建 `_specs/<feature-slug>.md`，随后停止。
- 初次收到精确批准口令：读取 [approval-sync.md](references/approval-sync.md) 和 [plan-template.md](plan-template.md)。先在内存校验 Plan 不扩大 Spec，通过后才写入并确认 Spec。
- 已有活动 Spec/Plan、代码或测试改动，或用户要求继续：读取 [resume-worktree.md](references/resume-worktree.md)，不得回到阶段 A。
- Plan 已确认不扩大 Spec 后：读取 [delivery-workflow.md](references/delivery-workflow.md)。

阶段 A 不运行测试、编译、lint、构建、打包或服务，只从配置和文档记录阶段 B 的真实命令。只有用户在 Spec 记录的审核 worktree 中输入完全一致的 `SPEC审核通过` 才算批准；含追加说明、同义表达或在其他工作区输入均不算。

Spec 使用 `FR-* / EDGE-* / NFR-* / AP-* / AC-* / Q-*` 三位编号，每个 AC 至少关联 FR、EDGE 或 NFR；关键 Q 未关闭或需实施 AP 未批准时不得进入阶段 B。Plan 只能引用当前 Spec 已有编号和范围。

批准后默认授权 feature worktree 内的范围内代码/测试、已批准依赖、安全本地验证、真实运行、独立只读审查、P0/P1 与有证据的重要 P2 修复、必要模块 README 更新。默认不授权 commit、push、merge、删除 branch/worktree、发布、生产写入、真实支付或范围外变化。

只有重要 AC 有证据、适用 Red/Green 有正确失败与通过记录、目标测试/回归/类型/lint/必要构建通过、关键真实运行完成或限制披露、独立审查无未解决 P0/P1、文档一致且无隐藏范围外改动时，才能声明“本地交付完成”。本项目不使用 CI。
