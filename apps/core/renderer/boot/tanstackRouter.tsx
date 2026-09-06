import { routeTree } from '@/renderer/routeTree.gen'
import { createHashHistory, createRouter } from '@tanstack/react-router'
import { RouteProgressBar } from '../components/common/RouteProgressBar'

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof tanstackRouter
  }
}
export interface RootRouteContext {
  title?: string
}

export const tanstackRouter = createRouter({
  context: {
    title: ''
  },
  history: createHashHistory(),
  InnerWrap: ({ children }) => {
    return (
      <>
        <RouteProgressBar />
        {children}
      </>
    )
  },
  routeTree,
  scrollRestoration: true
})
