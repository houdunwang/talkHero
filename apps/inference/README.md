# Inference 模块

## 职责与边界

`apps/inference` 是 TalkHero 本地推理基础设施边界，负责有版本的 Worker 消息协议、任务状态、计算档位、受管资源状态和固定系统探测。模型不得进入 Electron main 或 renderer；业务模块不得依赖 IndexTTS、MuseTalk、ASR 或 FFmpeg 的仓库内部布局。

当前代码实现协议解析、任务恢复策略、受管路径校验、Windows NVIDIA 探测、资源快照、一次性文件授权和单进程 Worker 生命周期。Worker 固定要求受管 Python 3.11，并提供环境健康、参考音频处理、IndexTTS 2.5、媒体质检和本地封面操作；资源下载安装与 MuseTalk 的安全人物跟踪/嘴部最小融合仍未完成，因此资源和口型能力保持 fail-closed。

## 关键入口与公共面

| 路径                              | 职责                                                |
| --------------------------------- | --------------------------------------------------- |
| `main/contracts.ts`               | `1.0` Worker 协议、任务转换、计算档位和受管路径规则 |
| `main/task-registry.ts`           | 任务状态、operation、受管输出身份与合法转换         |
| `main/task-service.ts`            | 原子任务日志、损坏显式状态和启动/退出恢复           |
| `main/worker-client.ts`           | Worker 启动、握手、进度、取消、崩溃与协议故障处理   |
| `main/resource-service.ts`        | 内置信任锚约束的受管资源校验                        |
| `main/file-grants.ts`             | 文件选择与 renderer、用途、有效期绑定的一次性授权   |
| `main/media-protocol.ts`          | 封面、音色和生成音频的只读受管预览协议              |
| `main/service.ts`、`main/ipc.ts`  | 固定环境探测、Worker 健康和仅限工作台窗口的 IPC     |
| `worker/worker.py`                | Python 3.11 独立进程内的模型和媒体适配边界          |
| `types/public.ts`、`types/ipc.ts` | 快照与 `talkhero:inference:environment` 公共契约    |
| `preload/index.ts`                | 暴露 `window.inference.getEnvironment()`            |

受管资源根固定为 Electron `userData/talkhero`；renderer 不能指定命令、下载域名或存储根。任务日志保存 operation 与受管相对输出身份，renderer 任务列表会移除内部输出路径。`talkhero-media://` 只接受不可枚举 UUID 与固定文件名，并在 `realpath` 后再次检查受管根及 Windows 跨卷边界。资源内置信任清单在来源、版本、许可证和完整文件哈希完成审计前为空，因此手工放置文件不会被误报为可用。macOS 只返回桌面壳限制说明，完整推理首版仅面向 Windows 11 x64 + NVIDIA CUDA。

## 验证与维护

目标测试：`pnpm exec vitest run apps/inference`。GPU、CUDA、Worker、模型、OOM、性能、打包路径和退出清理仍必须在 Windows 真实环境验证；单元测试和 macOS 构建不能替代。

协议、任务状态、受管目录、资源清单、Worker 生命周期或平台支持发生变化时更新本文件。通用策略见 [测试策略](../../docs/testing.md)。
