# Inference 模块

## 职责与边界

`apps/inference` 是 TalkHero 本地推理基础设施边界，负责有版本的 Worker 消息协议、任务状态、计算档位、受管资源状态和固定系统探测。模型不得进入 Electron main 或 renderer；业务模块不得依赖 IndexTTS、MuseTalk、ASR 或 FFmpeg 的仓库内部布局。

当前代码实现协议解析、任务恢复策略、受管路径校验、Windows NVIDIA 探测、受管资源安装器、资源快照、一次性文件授权和单进程 Worker 生命周期。Worker 固定要求受管 Python 3.11，并提供环境健康、参考音频处理、IndexTTS 2.5、媒体质检和本地封面操作；MuseTalk 的安全人物跟踪/嘴部最小融合仍未完成，因此口型能力保持 fail-closed。

## 关键入口与公共面

| 路径                               | 职责                                                |
| ---------------------------------- | --------------------------------------------------- |
| `main/contracts.ts`                | `1.0` Worker 协议、任务转换、计算档位和受管路径规则 |
| `main/task-registry.ts`            | 任务状态、受管输出身份、合法转换与终态记录移除      |
| `main/task-service.ts`             | 原子任务日志、损坏显式状态和启动/退出恢复           |
| `main/worker-client.ts`            | Worker 启动、握手、进度、取消、崩溃与协议故障处理   |
| `main/resource-service.ts`         | 内置信任锚约束的受管资源校验                        |
| `main/resource-installer.ts`       | 固定文件下载、路径/大小/哈希校验、原子安装与恢复    |
| `main/resource-install-service.ts` | 安装进度、取消、重试、退出收尾与 Electron 下载编排  |
| `main/file-grants.ts`              | 文件选择与 renderer、用途、有效期绑定的一次性授权   |
| `main/media-protocol.ts`           | 封面、音色、生成音频和视频的只读受管预览协议        |
| `main/service.ts`、`main/ipc.ts`   | 固定环境探测、Worker 健康和按操作限制窗口的 IPC     |
| `renderer/routes/config.tsx`       | 复用原系统配置布局展示环境、受管资源与任务          |
| `worker/worker.py`                 | Python 3.11 独立进程内的模型和媒体适配边界          |
| `types/public.ts`、`types/ipc.ts`  | 快照与 `talkhero:inference:environment` 公共契约    |
| `preload/index.ts`                 | 暴露 `window.inference.getEnvironment()`            |

受管资源根固定为 Electron `userData/talkhero`；renderer 不能指定命令、下载域名或存储根。安装器只接受应用内固定的 HTTPS 来源、版本、许可证、文件大小和 SHA-256，拒绝受管根本身或中间目录通过 symlink/junction 解析到其他位置，先写入同卷暂存目录，全部校验成功后再原子替换；校验/提交阶段取消会回滚，退出会取消并等待安装收尾，启动会对账原子切换遗留目录。取消、失败或损坏均不得污染当前可用版本。正式资源清单在安装包、下载来源、完整哈希和许可证尚未完成发布审计前保持为空，界面明确显示不可安装，而不是信任可变上游或手工放置文件。

任务日志保存 operation、受管相对输出身份和输出 SHA-256，renderer 任务列表会移除内部输出路径。`talkhero-media://` 只接受不可枚举 UUID 与固定文件名，并在 `realpath` 后再次检查受管根及 Windows 跨卷边界；视频预览会转发 Range 请求以支持拖动。macOS 只返回桌面壳限制说明，完整推理首版仅面向 Windows 11 x64 + NVIDIA CUDA。

软件不定义独立业务或配置窗口：`/inference/config` 通过 `config/routes.ts` 接入原系统 `setting` 窗口和 `SettingLayout`，展示环境、资源和任务并允许取消可取消任务。全部 inference IPC 只接受受信 `setting` 窗口，旧 `talkHero` 窗口身份不再有效。

## 验证与维护

目标测试：`pnpm exec vitest run apps/inference`。正式资源清单、安装/修复、GPU、CUDA、Worker、模型、OOM、性能、打包路径和退出清理仍必须在 Windows 真实环境验证；单元测试和 macOS 构建不能替代。

协议、任务状态、受管目录、资源清单、Worker 生命周期或平台支持发生变化时更新本文件。通用策略见 [测试策略](../../docs/testing.md)。
