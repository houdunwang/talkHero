<!-- managed-by: hd-sdd-tdd-setup -->
# Feature Worktree 阶段 B 续跑

1. 确认当前根路径和分支等于记录的 feature worktree/分支，无未完成 Git 操作；从 `_plans/` 找状态“已生成/执行中”的 Plan 与同 slug Spec，候选必须恰好一个。
2. 当前 feature HEAD 必须等于记录基线 SHA。逐文件收集状态；Spec/Plan 外每个路径必须属于 Spec 范围并出现在 Plan 影响范围或执行记录。范围变更待确认时，只允许旧 Plan 已记录的既有改动。异常路径阻塞，不 reset/rebase/清理。
3. 复核编号、AP/Q、已完成步骤和仍有效证据。Spec 已确认则读取 `delivery-workflow.md` 从下一个未完成步骤继续。
4. 实施中范围变化导致 Spec 待确认时，旧 Plan 保留。只有用户再次输入精确口令后，才读取 `../plan-template.md`，先在内存更新并校验 Plan，再写入、确认 Spec 并继续。

从未确认 Spec、空执行记录或“待重建（基线已变化）”Plan 不属于续跑，交回 `approval-sync.md`。已完成 Plan 不再是活动交付。
