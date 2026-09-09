# Video 模块

## 职责与边界

`apps/video` 是 A 视频业务边界，负责视频输入策略、目标人物选择、跟踪缓存键、局部嘴部融合约束、音轨选择和生成任务展示。它只消费已确认音频，不理解 B 视频或平台页面。

当前实现包含不超过 3 分钟、支持编解码、明确人物与明确音轨策略的纯契约，保证嘴部区域包含在跟踪人脸内，并让视频内容、跟踪器版本或参数变化使缓存失效。YuNet 候选跟踪纯策略只按人脸框、运动、尺度和五点几何连续性延续已确认主体；低置信、跳变或两个候选同样可信时 fail-closed，嘴部矩形也受下脸、面积和侧脸门禁约束。“生成视频”页已组合音色库与文案音频、受控 A 视频选择、FFprobe 媒体质检，并自动轮询和预览最新一条通过任务类型、路径及 SHA-256 复验的生成结果；真实 YuNet 检测、身份轨迹持久化、MuseTalk 执行、音轨合成与输出质量报告仍未落地。Worker 在这些安全条件满足前会明确拒绝口型任务，绝不输出整脸替代结果。

## 关键入口与装配

| 路径                             | 职责                                         |
| -------------------------------- | -------------------------------------------- |
| `main/contracts.ts`              | A 视频请求、局部区域和跟踪缓存规则           |
| `main/tracking-policy.ts`        | YuNet 五点的主体连续性与嘴部区域 fail-closed 规则 |
| `main/service.ts`、`main/ipc.ts` | 工作台能力快照、受控选材、媒体质检与窗口授权 |
| `types/`、`preload/index.ts`     | 工作台、选材和质检 bridge                    |
| `renderer/routes/workbench.tsx`  | “生成视频”页的音色音频、口型与当前结果编排   |

`config/main.ts`、`config/preload.shared.ts` 和 `config/routes.ts` 完成模块、bridge 与 `/video/workbench` 路由装配；页面复用原系统 `SettingLayout` 并组合 voice 的文案音频内容与 video 内容，各模块的 main、IPC 与持久化边界保持独立。生成历史及所选视频预览由独立 `/publish/workbench` 页面负责。`config/window.ts` 不声明独立业务窗口，原 `setting` 窗口负责首次启动；`config/dock.ts` 在 macOS 激活时也指向该窗口。菜单切换时保留当前窗口生命周期内已选 A 视频、授权确认、质检结果和进行中锁定。全部 video IPC 只接受受信 `setting` 窗口。

## 验证与维护

目标测试：`pnpm exec vitest run apps/video`。只改变嘴部、人物身份稳定、音画同步、源文件保护、原规格输出和性能必须由 Windows NVIDIA 授权素材与媒体差分验证。

工作台入口、IPC、视频状态、缓存、输出或平台验证边界变化时更新本文件。通用策略见 [测试策略](../../docs/testing.md)。
