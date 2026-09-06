<!-- managed-by: hd-sdd-tdd-setup -->
# 阶段 A：Main 与待确认 Spec

1. 用 Git 根目录、`pwd -P`、当前分支和完整 HEAD 确认当前为目标项目 `main` 根工作区，且无 merge/rebase/cherry-pick/revert/bisect。
2. `git status --porcelain=v1 --untracked-files=all` 必须为空；任何跟踪、暂存或未跟踪内容都阻塞。只报告，不 stash/reset/checkout/clean。
3. 生成合法小写短横线 slug，确认 `_specs/<slug>.md` 不存在、未跟踪、未暂存、未 ignore。
4. 完整读取 `../spec-template.md`，只创建该 Spec，记录物理根目录、main 与完整 SHA，状态待确认。
5. 用完整状态命令和 `git ls-files --others --exclude-standard` 证明只存在该非空、未跟踪 Spec。随后停止，不生成 Plan、代码，不运行测试、编译、lint、构建或服务。
