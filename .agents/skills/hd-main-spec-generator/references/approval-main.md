<!-- managed-by: hd-sdd-tdd-setup -->
# Spec 批准与 Main 基线校验

仅在记录的 main 工作区收到精确 `SPEC审核通过` 时使用。

1. 规范化当前根路径，核对 main 分支和无未完成 Git 操作。从 `_specs/` 定位根路径/分支匹配的唯一待确认未跟踪 Spec；不能依赖对话记忆。
2. 逐文件状态只能是该 Spec，或该 Spec 加唯一同 slug、可证明同源且执行记录为空的初次批准残留 Plan。其他改动阻塞。已有 Plan 必须先核对 slug、Spec、根目录、main 与基线，归属不明不得覆盖。
3. 复核 FR/EDGE/NFR/AP/AC/Q 与高风险验证。当前 HEAD 与记录 SHA 不同则分析新提交、更新 Spec 基线和内容并保持待确认，要求重新审核；不得切换、merge 或 rebase。
4. 基线未变时先在内存生成或校验 Plan，确保不新增产品范围、依赖、迁移、权限或公共契约；通过后才写入 `_plans/<slug>.md`，最后确认 Spec 并记录时间。失败时保留现场。
