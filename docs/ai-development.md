<!-- managed-by: hd-sdd-tdd-setup -->
# AI 开发与交付流程

人负责确认需求、中高风险 Spec、主观体验以及权限、支付、删除、数据和发布决策；AI 可以分析、计划、实现、测试、审查与修复。完成状态由可复核证据决定，不由聊天中的口头声明决定，也不承诺绝对零缺陷。

`AGENTS.md` 是项目硬规则，`_specs/*.md` 定义功能行为、范围、风险和 AC，`_plans/*.md` 记录受 Spec 约束的实施与证据，`docs/testing.md` 定义测试策略，`docs/release.md` 定义发布恢复，`apps/*/README.md` 维护模块边界。

## 风险与入口

- 低风险：文档、文案、纯样式或明确的小型内部调整。可走快速路径，不强制 Spec/Plan，但必须有完成条件和最小验证。
- 中风险：用户可见行为、普通 Bug、状态/持久化或单模块规则。必须先有简洁 Spec，确认后生成 Plan，对高价值行为使用 TDD，并完成独立审查。
- 高风险：认证、支付、权限、文件写入、原生能力、全局 Hook、跨模块/平台、签名、更新或不可逆数据变化。必须有 Spec、Plan、风险测试、真实环境验证、独立审查和发布恢复考虑。

用户必须在开始时选择一种 Git 模式：`hd-spec-generator` 从 `main` 的精确已提交 `HEAD` 创建隔离 feature worktree；`hd-main-spec-generator` 全程留在现有 clean `main` 根工作区。两者均以 Spec 为唯一人工审核点，且一次功能不得切换或混用。main 模式阶段 A 要求 `git status --porcelain=v1 --untracked-files=all` 为空；worktree 模式不会继承 main 的未提交改动，新功能依赖这些改动时必须等待提交。

## 标准状态机

```text
Discover → Specify → 人工确认 Spec → Plan → Implement
→ Self-Verify → Independent Review → Runtime Verify → Gate → Deliver
```

- Discover：阅读规则、相关模块、代码、测试和配置，确认现状与影响范围。
- Specify：创建待确认 `_specs/<feature-slug>.md`，用 `FR-* / EDGE-* / NFR-* / AP-* / AC-* / Q-*` 定义 What。只有用户在记录的审核工作区输入精确文本 `SPEC审核通过` 才能继续。
- Plan：创建 `_plans/<feature-slug>.md`，把已确认 Spec 映射到文件、顺序、TDD 和验证。Plan 不需要人工审核，但不得新增范围、依赖、迁移、权限或公共契约；发现需要时退回 Spec 重审。
- Implement：对高风险且适合稳定自动化的行为和 Bug 做 Red → Green → Refactor；其余采用最小实现与替代验证，不做范围外重构。
- Self-Verify：执行适用目标测试、相关回归、类型检查、lint、必要构建，并逐项核对 AC。
- Independent Review：由未参与实现的独立上下文只读审查已确认 Spec、Plan、相对基线 diff、测试和真实运行证据；P0/P1 阻断交付，修复后复验。没有真正独立上下文时必须降级为“独立审查未完成”。
- Runtime Verify：在 macOS 15+ Apple Silicon 或 Windows 11 x64 的适用真实桌面环境验证自动化不能证明的权限、设备、原生、窗口、安装与外部服务行为，准确区分 Mock、测试服务与真实服务。
- Gate：本项目不使用 CI，也没有单一 `verify`；以 `docs/testing.md` 中适用的本地命令集合为门禁。
- Deliver：输出 AC 映射、实际命令和结果、TDD 证据、真实运行、独立审查、未执行项与剩余风险。

## 完成定义

只有重要 AC 均有实现和验证证据，适用的 Red/Green 有正确失败与通过记录，目标测试和相关回归通过，类型检查/lint/必要构建通过，关键真实运行完成或限制已明确披露，独立审查无未解决 P0/P1，且 Spec、Plan、代码、测试和模块文档一致时，才能声明“本地交付完成”。

| 验收项 | 实现位置 | 验证方式 | 结果 |
|---|---|---|---|
| AC-* | 文件或模块 | 测试、命令或真实运行 | 通过 / 失败 / 未执行 |

交付还应列出执行命令与结果、真实运行环境、独立审查结论、未执行验证和剩余风险。已有无关失败应单独记录，不能掩盖，也不能借机扩大修改范围。外部写入、发布、删除、真实支付与不可逆操作仍需明确授权。
