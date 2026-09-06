<!-- managed-by: hd-sdd-tdd-setup -->
# Spec 批准与基线同步

仅在用户于记录的审核 worktree 输入精确 `SPEC审核通过` 时使用。

1. 规范化并核对当前根路径、feature 分支、记录基线和无未完成 Git 操作；feature 分支从基线起不得有提交。
2. 逐文件状态只能是唯一待确认 Spec，或该 Spec 加唯一同 slug、可证明同源且执行记录为空的初次批准残留 Plan；其他内容阻塞。已有 Plan 在写入前核对 slug、Spec、分支、worktree 与基线，归属不明不得覆盖。
3. 校验 Spec 编号追溯、关键 Q、AP 和高风险 AC。比较记录基线与当前 main HEAD。
4. main 已前进时，仅在上述干净条件下允许一次无强制选项的 `git -C <worktree> rebase <latest-sha>`；成功后更新 Spec 基线并保持待确认，残留 Plan 标为“待重建（基线已变化）”，要求重新审核。本次不得编码。失败时保留现场停止。
5. 基线未变时先在内存生成/重建 Plan，校验只引用 Spec 编号且不新增行为、依赖、迁移、权限或公共契约；通过后写 `_plans/<slug>.md`，最后确认 Spec 并记录时间。写入失败保留现场。
