import { physical, rootRoute } from '@tanstack/virtual-file-routes'
import type { VirtualRootRoute } from '@tanstack/virtual-file-routes'

// 生成应用的虚拟路由树。
export const createRoutes = (): VirtualRootRoute =>
  rootRoute('__root.tsx', [
    physical('/core', '../../../apps/core/renderer/routes'),
    physical('/auth', '../../../apps/auth/renderer/routes'),
    physical('/', '.')
  ])
