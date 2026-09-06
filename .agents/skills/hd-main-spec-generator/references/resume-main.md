<!-- managed-by: hd-sdd-tdd-setup -->
# Main 阶段 B 续跑

1. 确认当前是记录的 main 根工作区且无未完成 Git 操作；从 `_plans/` 查找状态“已生成/执行中”的 Plan 与同 slug Spec，候选必须恰好一个。
2. 当前 HEAD 必须等于记录基线 SHA。逐文件收集状态；Spec/Plan 外每个路径必须属于 Spec 范围并在 Plan 影响范围或执行记录中。范围变更待确认时只允许旧 Plan 已记录的既有改动。异常路径阻塞，不执行任何 Git 清理或同步。
3. 复核编号、AP/Q、已完成步骤和仍有效证据。Spec 已确认则读取 `delivery-workflow.md` 从下一个未完成步骤继续。
4. 实施中范围变化导致 Spec 待确认时保留旧 Plan；仅在收到精确批准口令后，读取 `../plan-template.md`，先在内存更新并校验，再写入、确认 Spec 并继续。

已完成 Plan 不再是活动交付；开始新功能前必须由用户处理现场并恢复 clean。
