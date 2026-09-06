<!-- managed-by: hd-sdd-tdd-setup -->
# Main 工作区的 TDD 与交付

实施前确认 Plan 只引用 Spec 编号，每个 AC 映射实施和验证，文件/API/装配/命令来自仓库，当前仍是记录的 main 根工作区和 HEAD，且没有未批准范围。

对状态机、业务规则、Bug、IPC/输入策略、持久化和稳定契约执行 Red → Green → Refactor → Validation。Red 必须因目标缺失或旧 Bug 正确失败；不得用编译/环境错误、弱断言、跳过、改 AC 或过度 Mock 制造证据。

所有修改留在当前 main 工作区。每轮写入前后逐文件检查 Git 状态，Spec/Plan 外路径必须已在 Plan 影响范围或执行记录；出现无法归属改动时立即停止，不读取、覆盖或清理。按成本执行目标测试、相关回归、`pnpm typecheck`、`pnpm lint`、必要构建/平台包与真实桌面验证。本项目不使用 CI。

使用 `hd-regression-testing` 选回归，模块知识变化时使用 `hd-module-doc-maintainer`。第一轮验证后由未参与实现的独立上下文用 `hd-code-review` 审查；修复 P0/P1 及有证据的重要 P2，复验并最多三轮。无独立上下文时降级结论。

在 Plan 记录步骤、TDD、命令、真实环境、审查修复、非实质偏差与 AC 映射。全部本地门禁满足才声明“本地交付完成”。全程不创建/切换/合并/rebase/删除 branch/worktree，不 commit、push 或发布。
