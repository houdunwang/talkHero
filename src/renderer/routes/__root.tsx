import type { RootRouteContext } from '@apps/core/renderer/boot/tanstackRouter'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createRootRouteWithContext<RootRouteContext>()({
  component: RootComponent
})

function RootComponent() {
  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === '.' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        window.core.window.windowShow('setting')
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  return <Outlet />
}
