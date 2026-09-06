<!-- managed-by: hd-sdd-tdd-setup -->
# 阶段 A：基线、Worktree 与待确认 Spec

1. 在目标根目录确认 `main`、完整 HEAD、物理根路径和 `git worktree list --porcelain`。先证明 `AGENTS.md`、`docs/ai-development.md`、`docs/testing.md` 及两个 Spec Skill 已被当前 HEAD 跟踪且相对 HEAD 未修改；否则报告“尚未激活”并停止。
2. 用 `git status --porcelain=v1 --untracked-files=all` 和 `git ls-files --others --exclude-standard` 逐文件记录 main 状态，并检查 merge/rebase/cherry-pick/revert/bisect。未完成 Git 操作阻塞；普通 dirty 文件不阻塞但不得读取为代码事实、修改或带入新 worktree。需求依赖或明显重叠时停止等待其进入提交。
3. 生成合法小写短横线 `feature-slug`，分支为 `electron/<feature-slug>`，用 `git check-ref-format --branch` 校验。确认同名分支、Spec 和目标 worktree 路径不存在。
4. 锁定完整 SHA，从该 SHA 执行 `git worktree add -b <branch> <absolute-path> <sha>`；核实新 worktree 的分支和 HEAD。
5. 只在新 worktree 重新读取规则、相关模块 README、代码、测试与配置，完整读取 `../spec-template.md`，创建非空 `_specs/<feature-slug>.md`，状态“待确认”，记录 main、SHA、feature 分支和物理绝对 worktree 路径。
6. Spec 必须未跟踪、未暂存、未提交且未 ignore；用两条逐文件状态命令证明新 worktree 只包含该 Spec。随后停止，不生成 Plan 或代码，不运行项目命令。

不得 stash、reset、checkout、clean、覆盖或删除用户文件。创建失败或状态异常时保留现场并报告。
