# 自动更新单段 Range 下载修复编码计划

## 0. 文档状态
- 状态：已完成
- 状态说明：Spec 范围内修复、适用本地门禁、当前 macOS 下载与打包配置验证及独立审查均通过；Windows、签名、公证与真实更新安装未验证。

## 1. 基本信息
- feature-slug：updater-single-range-download
- Spec：`_specs/updater-single-range-download.md`（已确认）
- 项目根目录：/Users/hd/code/talkHero
- 基线：main / a76c991741a68b575c08f611df7f43631e607716
- feature 分支：无（main 模式禁止创建）
- worktree：/Users/hd/code/talkHero（现有 main 工作区）
- 模块归属：apps/core 更新配置
- 范围来源：仅上述 Spec

## 2. 引用清单
- FR-001～003、EDGE-001～003、NFR-001～003、AC-001～003；AP 与关键 Q 均无。

## 3. 实施原则
- 只修改两份 provider 配置及必要测试/说明；下载与回退使用现有依赖，不新增生产逻辑或依赖。
- 留在当前 main，不执行 branch/worktree 操作，不提交、推送、发布或安装更新。

## 4. 影响范围
| 模块或文件 | 计划变更 | 对应编号 |
|---|---|---|
| dev-app-update.yml | generic provider 禁用多段 Range | FR-001 |
| electron-builder.yml | 同步 publish provider 选项 | FR-001 |
| apps/core/main/updater/download.test.ts | 实际 provider 与下载协议回归 | AC-001、AC-002 |
| apps/core/main/updater/download-fixture.cjs（如需共用） | 仅测试使用的合成文件、HTTP 服务与真实下载器驱动 | AC-001、AC-002、AC-003 |
| apps/core/README.md | 按需补充更新配置和验证边界 | FR-001、NFR-003 |
| 系统临时目录 | 真实 Electron 下载验证入口、受限网络探测、未签名配置验证产物与日志 | AC-003、NFR-002 |

## 5. 前置依赖与顺序
无新增依赖。先核验当前依赖 API，编写下载行为回归并运行 Red，再修改配置、运行 Green 与相关门禁，最后真实环境验证和独立审查。

## 6. 风险与验证
| 风险 | 等级 | 对应编号 | 验证 |
|---|---|---|---|
| multipart 类型不兼容 | 中 | AC-001 | 实际多片段下载在单段服务上复现，再验证成功 |
| 回退或摘要校验失效 | 高 | AC-002 | 使用实际 updater/下载器，合成缓存与失败响应 |
| 实际服务不支持单段 | 高 | AC-003 | 限量、限时只读 Range 探测 |
| 误安装或真实数据修改 | 高 | NFR-002 | 隔离 Electron 验证进程，仅合成数据，不启动生产安装流程 |
| 配置未传递到发布产物 | 中 | FR-001 | 构建配置校验及未签名本地配置传递验证 |

## 7. TDD 顺序
### TDD-1：单段服务上重建差分文件
- 关联编号：AC-001、FR-001、FR-002。
- Red：`pnpm exec vitest run apps/core/main/updater/download.test.ts`，旧配置应因 multipart Content-Type 不符失败。
- Green：两份 YAML 增加 useMultipleRangeRequest: false，同一行为测试通过。
- Refactor：只做必要测试整理，无生产重构。
- Validation：目标测试与 core 回归；回退、完整下载失败/损坏用独立场景验证。

## 8. 非 TDD 步骤
| 步骤 | AC | 原因 | 替代验证 |
|---|---|---|---|
| 服务与 Electron 验证 | AC-003 | 系统/真实网络行为 | 临时脚本记录环境、响应头、数据长度与结果 |
| 打包配置传递 | AC-003 | 构建装配 | 工具链配置处理或未签名目录包验证 |

## 9. 分阶段实施
单阶段完成 FR-001～003 与 EDGE/NFR：行为测试 → 两行配置修复 → 门禁 → 真实运行 → 独立只读审查 → 记录证据与限制。

## 10. 验证命令
- 目标测试：`pnpm exec vitest run apps/core/main/updater/download.test.ts`
- 相关回归：`pnpm exec vitest run apps/core`
- 类型：`pnpm typecheck`
- 静态检查：`pnpm lint`
- 构建：`pnpm build`；配置传递验证不签名、不公证、不发布。
- CI：不使用。

## 11. 真实运行
| AC | macOS/Windows 环境 | 操作 | 预期 | 证据 |
|---|---|---|---|---|
| AC-003 | macOS 27.0（26A428）arm64 / Electron 39.2.6 | 隔离 Electron 下载合成数据与限量真实服务探测 | 单段请求正常、摘要正确 | 通过；详见执行记录 |
| AC-003 | Windows 11 x64 | 有真实环境时执行同类验证 | 配置生效 | 未执行：当前无 Windows 真实运行环境 |

## 12. 独立审查重点
由未参与实现的独立上下文使用 hd-code-review，审查 AC、协议 fixture 是否真实、完整下载与摘要校验、配置传递、范围及平台证据。不得更改更新 URL 或执行安装。

## 13. 文档更新
根据最终测试与配置，必要时最小更新 apps/core/README.md，不重复维护 Spec 和执行日志。

## 14. 发布与恢复
无数据迁移。撤销本次 provider 选项即可恢复原下载策略；不触碰安装产物和远端。真实签名安装与 Windows 完整更新另需相应环境，未验证项如实列出。

## 15. 完成映射
| AC | 实施步骤 | 自动化 | 真实验证 |
|---|---|---|---|
| AC-001 | 两份配置已修改 | 2 场景正确 Red 后 Green | 实际 Electron 两配置合成差分下载通过 |
| AC-002 | 保留依赖回退与应用错误流程 | 4 回退/失败/摘要场景通过，连接审查通过 | 未执行真实安装（范围外） |
| AC-003 | ZIP 内配置传递与 diff 范围核对通过 | 类型、lint、构建通过 | 当前 macOS 与真实服务验证通过；Windows/签名/安装未验证 |

## 16. 执行记录
- 开始时间：2026-09-23 00:14（Asia/Shanghai）。
- 当前阶段：本地交付完成（上述平台与安装限制已披露）。
- 基线校验：路径、main、完整 HEAD 相符；无未完成 Git 操作；批准时仅存在本 Spec。
- Plan 范围校验：无新增产品行为、依赖、迁移、权限或公共契约。
- Red：2026-09-23 00:17，目标测试 2 失败 / 4 通过；development、packaged 均因 `Content-Type "multipart/byteranges" is expected, but got "application/zip"` 正确失败，非环境或类型错误。
- Green：00:18，仅两份 YAML 各新增一行 useMultipleRangeRequest: false；相同 6 个目标测试全部通过。两个成功用例均实际发出 bytes=4-7、bytes=12-15 并重建正确内容。
- 相关回归：`pnpm exec vitest run apps/core`，3 文件 / 11 测试全部通过。
- `pnpm typecheck` 通过；`pnpm lint` 退出 0，0 errors / 1 既有格式 warning（apps/core/renderer/routes/config.tsx:80，该文件未改）。
- AC-002：真实 NsisUpdater 下载路径（Node HTTP 传輸替换，无安装/平台签名验证）验证差分请求 503 和缺失旧包均回退成功；完整下载 503、sha512 不符均拒绝、发出 error 且无 update-downloaded。应用现有 index.ts 的 error 与 update-downloaded 监听连接经只读核对，未改其状态逻辑。
- 真实服务探测：清单 HTTP 200、526 bytes；bytes=0-31 返回 206 / application/zip / Content-Range bytes 0-31/127322011 / 32 bytes；bytes=0-15,32-47 只返回第一区间（206 / application/zip / bytes 0-15/127322011 / 16 bytes）。下载上限分别为 64 KiB 清单与 64 bytes 探测；未下载完整生产安装包、未安装或写远端。
- 真实 Electron：macOS 27.0（26A428）arm64，Electron 39.2.6；临时脚本用实际 MacUpdater 与 ElectronHttpExecutor 下载 loopback 合成数据，两份配置均重建 16 bytes，实际 Range 为 bytes=4-7、bytes=12-15，无完整下载回退。隔离 userData/cache，关闭自动安装并阻止 native 安装入口；这是实际 Electron 主进程协议验证，不是 UI、签名或完整安装验收。
- 临时真实运行入口：系统临时目录 talkhero-updater-runtime-Er2hGu/runtime.cjs，由 Node 启动本机 Electron 二进制执行；下载 fixture 临时缓存由 dispose 清理，独立审查后清理运行入口与隔离用户目录。
- README：补充单段配置与协议测试边界，使用 hd-module-doc-maintainer 最小维护。
- `pnpm build` 通过（退出 0），main/preload/renderer 均构建成功。已有 auth store 静态/动态混合导入提示，不属于本次变更。
- 配置传递：Node 调用 electron-builder 26.15.3 `build({ targets: Platform.MAC.createTarget('zip', Arch.arm64), publish: 'never', config: { directories: { output: <临时目录> }, mac: { identity: null, notarize: false } } })`，并设置 CSC_IDENTITY_AUTO_DISCOVERY=false；本地未签名 ZIP 与 blockmap 生成成功，退出 0，无上传/安装。实际包内 app-update.yml 的 provider 为 generic、useMultipleRangeRequest 为 false、URL 与源配置相同，断言通过。
- 验证方式调整：首次使用 dir target，目录包构建成功，但读取 app-update.yml 因不存在失败；查明 PublishManager 仅为 macOS dmg/zip target 写入该配置，故改用 zip target。未改产品 Spec 或仓库签名配置；首次探测不计通过。
- 独立审查：未参与实现的 updater_review 上下文按 hd-code-review 完整只读审查；独立重跑目标测试 6/6，通过 diff --check，核对实际 runtime 脚本与包内 app-update.yml。结论“通过”，无 P0/P1/P2。审查者未重复真实服务探测、Electron 运行或构建，采用主代理执行证据。
- 实施总范围：两行生产配置、下载回归与 fixture、core README、Spec/Plan。无业务代码、依赖、URL、签名配置、IPC、持久化结构或安装策略变更。
- 剩余限制：没有 Windows 11 x64 环境；未验证签名、公证、完整生产安装/重启链路及 GUI 启动交互，不以 Node NSIS 测试或 Electron 合成下载代替这些验收。无提交、推送、发布。
- 完成时间：2026-09-23 00:23（Asia/Shanghai）。
