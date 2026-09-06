# Auth 模块

## 职责与边界

`apps/auth` 管理官网账号登录、订阅状态和支付流程，向登录、支付与订阅 renderer 页面提供受控 IPC。主进程持有认证/支付状态机、网络请求与本地状态；renderer 只展示状态并发起允许的操作。

该模块不负责通用 HTTP、窗口创建、更新或授权码兼容流程；这些分别属于 `apps/core` 与 `apps/secret`。不得从 renderer 直接持有令牌、访问支付接口或绕过窗口授权。

## 关键入口

| 路径 | 职责 |
|---|---|
| `main/index.ts` | 加载认证 IPC |
| `main/flow.ts`、`main/service.ts` | 认证/支付状态机及官网请求适配 |
| `main/contracts.ts`、`main/ipc.ts` | 参数、窗口权限与公共 IPC 边界 |
| `main/store.ts` | `auth` 持久化状态 |
| `preload/index.ts` | 暴露 `window.auth` 最小 bridge |
| `renderer/routes/` | 登录、支付与订阅页面 |

## 运行与公共接口

`config/main.ts` 加载主进程，`config/preload.ts` 加载 bridge，`config/routes.ts` 注册 `/auth/*`，`config/window.ts` 注册 `login`、`pay` 窗口。renderer 请求经 preload 到主进程，主进程按窗口和操作校验后驱动状态机，并把快照广播给存活窗口。

`window.auth` 提供快照、退出登录、登录二维码与轮询、购买选项、支付创建/轮询/同步/取消以及快照订阅。`auth:logout` 只允许 `setting` 窗口无参数调用；主进程使用当前 token 请求官网 `/api/core/logout`，仅在 2xx 或 401 时清空认证、软件与全部登录/支付内存会话，广播空快照并收口到独立登录窗口，其他失败保留当前状态供重试。IPC 名称集中在 `types/ipc.ts`；新增操作必须同步 main、preload、类型与允许窗口策略。

## 状态与外部边界

`CreateStore('auth')` 保存认证相关状态；修改结构必须验证旧数据兼容。官网响应、订阅周期和 renderer 参数均不可信，主进程负责校验、错误分类与客户端销毁清理。软件微信支付下单与查单分别使用官网 `/api/soft/pays/softWepay` 和 `/api/soft/pays/softWepayCheck`；请求仍由主进程通过统一 request 基础设施发送。真实登录、支付和生产账号属于高风险操作，测试不得使用真实凭据或真实支付。

软件详情通过 request 基础设施请求 `/soft/softs/by-name/{packageName}`，与已包含 `/api` 的 base URL 组合为 `/api/soft/softs/by-name/{packageName}`；`packageName` 必须作为单一路径段编码。该请求不回退旧 `/core/softs` 命名空间，响应继续按 `{ data: Soft }` 校验。

## 测试与维护

契约和状态机测试位于 `main/contracts.test.ts`、`main/flow.test.ts`。目标测试可运行 `pnpm exec vitest run apps/auth/main/contracts.test.ts apps/auth/main/flow.test.ts`；网络、二维码、登录与支付仍需隔离测试环境或明确的人工验证。通用策略见 [测试策略](../../docs/testing.md)。

职责、IPC、窗口授权、状态结构、官网契约或验证方式变化时更新本文件。
