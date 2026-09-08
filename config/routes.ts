import { physical, rootRoute, route } from '@tanstack/virtual-file-routes'
import type { VirtualRootRoute } from '@tanstack/virtual-file-routes'

// 生成应用的虚拟路由树。
export const createRoutes = (): VirtualRootRoute =>
  rootRoute('__root.tsx', [
    physical('/core', '../../../apps/core/renderer/routes'),
    physical('/auth', '../../../apps/auth/renderer/routes'),
    physical('/inference', '../../../apps/inference/renderer/routes'),
    route('/voice/config', '../../../apps/voice/renderer/routes/config.tsx'),
    physical('/video', '../../../apps/video/renderer/routes'),
    route('/publish/workbench', '../../../apps/publish/renderer/routes/workbench.tsx'),
    physical('/', '.')
  ])
