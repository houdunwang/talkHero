# Secret 模块

## 职责与边界

`apps/secret` 保存并向官网绑定/验证旧授权码，使用设备码和软件包名形成请求。它与 `apps/auth` 的账号订阅流程不同，不负责二维码登录或支付状态机。

授权码属于敏感数据，只能由主进程持有和持久化；不得记录、回传到无关窗口或写入测试样例。

## 关键入口

| 路径 | 职责 |
|---|---|
| `main/index.ts` | 延迟验证已存授权码 |
| `main/helper.ts` | 绑定、验证与 HTTP 状态映射 |
| `main/store.ts` | `secret` 持久化和清理 |
| `main/ipc.ts` | `secret:bindLicense` IPC |
| `preload/index.ts` | `window.secret` bridge |
| `renderer/routes/bind.tsx` | 授权码绑定页面 |

## 装配状态与流程

当前 `config/main.ts`、`config/preload.ts` / `config/preload.shared.ts` 和 `config/routes.ts` 未装配本模块，因此上述入口不会进入正常应用启动与路由。启用该模块必须显式登记 main、preload、route 和必要窗口/菜单，不能仅增加 import 调用方。

绑定流程：renderer 输入授权码 → 主进程获取设备码并请求官网 → 按 HTTP 状态返回稳定结果 → 成功后保存，明确无效/失效状态时清除。网络错误不能误删仍可能有效的授权码。

## 测试与维护

当前没有自动化测试。若重新启用，必须优先测试 IPC 发送方与参数校验、401/402/403/404/网络失败映射、敏感值不泄漏和旧 store 兼容，并在隔离服务验证；不得使用生产授权码。通用策略见 [测试策略](../../docs/testing.md)。

装配状态、官网契约、清除策略、持久化或 bridge 变化时更新本文件。
