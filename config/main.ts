// 在这里定义主进程模块加载器及其执行顺序，入口文件负责按顺序调用。

export const mainModuleLoaders = [
  () => import('@apps/core/main'),
  () => import('@apps/auth/main')
] as const
