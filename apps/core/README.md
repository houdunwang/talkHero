# Core 模块

## 职责与边界

`apps/core` 是共享 Electron 基础设施，负责应用启动、单实例、窗口工厂、Tray、权限、通用 store、网络请求、系统操作、Dock、设备信息和自动更新。业务模块复用这些能力，但业务规则和业务状态必须留在各自模块。

renderer 不得直接访问主进程实现；core preload 只能暴露最小系统、窗口、更新、平台和配置接口。不得把特定业务模块逻辑并入 core 以规避正常装配。

## 关键入口

| 路径                                    | 职责                              |
| --------------------------------------- | --------------------------------- |
| `main/index.ts`、`main/system/index.ts` | 主进程启动与全局生命周期          |
| `main/boot/index.ts`                    | 窗口和更新初始化                  |
| `main/window/`                          | 窗口创建、注册、定位与 IPC        |
| `main/store/`                           | `electron-store` 封装和 store IPC |
| `main/request/`、`main/externalUrl.ts`  | 网络与外部 URL 边界               |
| `main/tray/`、`main/updater/`           | Tray 聚合与自动更新               |
| `preload/index.ts`                      | 暴露 `window.core`                |

## 启动与装配

- `src/main/index.ts` 先设置 userData 路径，再由 `config/main.ts` 首先加载 core。core 取得单实例锁，等待 Electron ready，初始化窗口、更新、启动项与系统监听。窗口和 Tray 的声明分别来自 `config/window.ts` 与 `config/tray.ts`。
- `config/preload.shared.ts` 在所有窗口装配 core bridge；renderer 根 Provider 由 `src/renderer/main.tsx` 启动。

## 窗口与共享能力

- `main/window/` 是全部窗口的创建、访问控制和 renderer window API 边界；窗口名称 IPC 只接受 `config/window.ts` 已登记的名称，未标记 `createOnStartup: true` 的窗口仅登记配置并按需创建，`requiresFeatureAccess: false` 的免费窗口不会被登录或订阅门禁关闭。
- 窗口默认不随应用启动创建；只有显式设置 `createOnStartup: true` 的窗口由 `initWindow()` 创建，其余窗口仍须通过统一 `createWindow()` 按需创建。
- 统一窗口创建器只透传业务窗口明确声明的 `webPreferences.backgroundThrottling`，并继续强制公共 preload、上下文隔离和禁用 Node 集成；隐藏的实时媒体宿主可据此申请不降速运行。
- `main/dock/` 管理 Dock 与任务栏图标状态；macOS 没有可见窗口时，激活应用会打开 `config/dock.ts` 指定的窗口。
- 原系统 `setting` 窗口和 `SettingLayout` 是统一软件界面；业务模块通过自身 renderer 路由接入 `config/menus.tsx`，但业务状态、IPC 与权限仍留在对应模块。该窗口负责首次启动和 Dock 激活；项目不再声明独立 `talkHero` 工作台窗口。
- `renderer/route-session.ts` 保存同一窗口生命周期内的临时路由状态，避免菜单切换卸载页面时丢失仍在执行的工作流结果；具体状态实例仍由业务模块持有。
- `main/store/` 提供 `CreateStore`、主进程 IPC 和 preload store bridge；`CreateStore.replaceAll` 用于以已校验完整对象精确替换持久化内容；核心设置 store 名为 `core`，桥接 channel 为 `config`。
- `main/updater/` 提供官网分发使用的 `electron-updater`。
- `main/request/` 是仅供主进程模块复用的受信网络边界，不向 renderer 注册通用 request IPC；401 默认收口到登录窗口，需要先完成原子业务清理的专用请求可显式关闭该跳转并自行处理。`main/externalUrl.ts`、`main/apps/helper.ts` 分别提供外链和本机应用路径边界。

## 高风险边界

窗口 IPC 必须从 `event.sender` 解析并限制目标窗口；名称、尺寸、位置和列表参数必须校验。通用 store IPC 直接接触持久化，新增调用方应避免暴露任意键或清空能力。网络、外部 URL、权限、启动项和自动更新必须在主进程验证输入与失败状态。

窗口、Tray、更新、权限监听与 store handler 要避免重复注册，并在退出或窗口销毁时释放。签名、公证、更新源与用户数据不进入日志或测试 fixture。

## 测试与维护

`main/shortcut/helper.test.ts` 覆盖全局快捷键注册 helper，`main/request/index.test.ts` 覆盖 401 默认跳转与专用请求禁用跳转；其他共享 IPC、权限、窗口和更新能力主要依赖相关模块测试及真实桌面验证。目标测试：`pnpm exec vitest run apps/core/main/shortcut/helper.test.ts apps/core/main/request/index.test.ts`。通用策略见 [测试策略](../../docs/testing.md)。

共享职责、启动顺序、preload 公共面、窗口/store 契约、权限或更新边界变化时更新本文件。
