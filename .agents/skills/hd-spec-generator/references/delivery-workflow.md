<!-- managed-by: hd-sdd-tdd-setup -->
# Feature Worktree 的 TDD 与交付

实施前确认 Plan 只引用当前 Spec 编号，每个 AC 映射实施和验证，文件/API/装配/命令来自仓库，且没有未批准依赖、迁移、权限或公共契约。

对状态机、业务规则、Bug、IPC/输入策略、持久化和稳定契约执行 Red → Green → Refactor → Validation。Red 必须因目标缺失或旧 Bug 正确失败；编译/路径/fixture/环境错误不算。不得弱化测试、改 AC、吞退出码或过度 Mock。

只在 feature worktree 修改 Spec 范围。新增防御分支必须有 Spec、契约、失败测试、历史 Bug 或真实证据；错误必须可观察。每轮按成本执行目标测试、同模块回归、`pnpm typecheck`、`pnpm lint`、必要 `pnpm build`/平台包和真实桌面验证。本项目不使用 CI。未运行不能写通过。

使用 `hd-regression-testing` 选择回归；模块职责/接口/持久化/平台/验证事实变化时使用 `hd-module-doc-maintainer`。第一轮验证后由未参与实现的独立上下文用 `hd-code-review` 审查 Spec、Plan、基线 diff 和证据。修复 P0/P1 及有证据的重要 P2，复验并最多重审三轮；无独立上下文则结论降级。

在 Plan 执行记录中维护步骤、Red/Green、命令、真实环境、审查修复、非实质偏差与 AC 映射。满足全部本地门禁才声明“本地交付完成”；默认不提交、推送、合并、删除 worktree/分支或发布。
