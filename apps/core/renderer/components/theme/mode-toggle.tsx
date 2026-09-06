import { Moon, Sun } from 'lucide-react'

import { Button } from '@/renderer/shadcn/ui/button'
import { useTheme } from './theme-provider'

export function ModeToggle(): React.JSX.Element {
  const { setTheme } = useTheme()

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = document.documentElement.classList.contains('dark')
    const newTheme = isDark ? 'light' : 'dark'

    // @ts-ignore View Transitions API is not yet included in the configured DOM types.
    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    document.documentElement.classList.add('theme-transition')

    // @ts-ignore View Transitions API is not yet included in the configured DOM types.
    const transition = document.startViewTransition(() => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
      setTheme(newTheme)
    })

    transition.ready.then(() => {
      // @ts-ignore The pseudoElement option is missing from the configured DOM types.
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })

    transition.finished.then(() => {
      document.documentElement.classList.remove('theme-transition')
    })
  }

  return (
    <Button variant="link" size="icon" onClick={toggleTheme} className="p-1 ">
      <Sun className="size-3 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-3 scale-0 rotate-90 text-foreground transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
