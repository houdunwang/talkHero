# Video 模块

## 职责与边界

`apps/video` 是 TalkHero 主工作台与 A 视频业务边界，负责视频输入策略、目标人物选择、跟踪缓存键、局部嘴部融合约束、音轨选择和生成任务展示。它只消费已确认音频，不理解 B 视频或平台页面。

当前实现包含不超过 3 分钟、支持编解码、明确人物与明确音轨策略的纯契约，保证嘴部区域包含在跟踪人脸内，并让视频内容、跟踪器版本或参数变化使缓存失效。工作台已提供受控 A 视频选择和 FFprobe 媒体质检；人物检测、身份锁定、跟踪缓存、MuseTalk 执行、音轨合成与输出质量报告仍未落地。Worker 在这些安全条件满足前会明确拒绝口型任务，绝不输出整脸替代结果。

## 关键入口与装配

| 路径                             | 职责                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `main/contracts.ts`              | A 视频请求、局部区域和跟踪缓存规则                          |
| `main/service.ts`、`main/ipc.ts` | 工作台能力快照、受控选材、媒体质检与窗口授权                |
| `types/`、`preload/index.ts`     | 工作台、选材和质检 bridge                                   |
| `renderer/routes/workbench.tsx`  | `/video/workbench` 主工作台                                 |

`config/main.ts`、`config/preload.shared.ts`、`config/routes.ts` 和 `config/window.ts` 完成模块、bridge、路由与 `talkHero` 主窗口装配；`config/dock.ts` 在 macOS 激活时指向该窗口。

## 验证与维护

目标测试：`pnpm exec vitest run apps/video`。只改变嘴部、人物身份稳定、音画同步、源文件保护、原规格输出和性能必须由 Windows NVIDIA 授权素材与媒体差分验证。

工作台入口、IPC、视频状态、缓存、输出或平台验证边界变化时更新本文件。通用策略见 [测试策略](../../docs/testing.md)。
