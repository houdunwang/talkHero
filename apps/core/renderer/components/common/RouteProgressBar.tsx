import { useRouterState } from '@tanstack/react-router'
import nprogress from 'nprogress'
import { useEffect } from 'react'

nprogress.configure({
  showSpinner: false,
  trickleSpeed: 50, // 增加进度条递增的频率（默认是 800ms），使其看起来在不断往前走
  speed: 500, // 每次步进的 CSS 动画过渡时间，使其更平滑
  minimum: 0.1 // 起始百分比稍微大一点点
})

//页面切换进度条
export const RouteProgressBar = () => {
  const isPending = useRouterState({ select: (s) => s.status === 'pending' || s.isLoading })

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    if (isPending) {
      timeoutId = setTimeout(() => {
        nprogress.start()
      }, 300)
    } else {
      nprogress.done()
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isPending])

  return null
}
