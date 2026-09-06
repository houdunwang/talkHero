import { useEffect, useState } from 'react'
import { useSetAtom } from 'jotai'
import '../plugin/dayjs'
import { useConfig } from './useConfig'
import { authAtom, loadAuthSnapshot, softAtom } from '@apps/auth/renderer/state'

//应用启动初始化数据
export const useInit = (): { isLoading: boolean } => {
  const { loadConfig } = useConfig()
  const [isLoading, setIsLoading] = useState(true)
  const setAuth = useSetAtom(authAtom)
  const setSoft = useSetAtom(softAtom)

  useEffect(() => {
    const applySnapshot = (snapshot: Awaited<ReturnType<typeof loadAuthSnapshot>>): void => {
      setAuth(snapshot.auth)
      setSoft(snapshot.soft)
    }
    const unsubscribe = window.auth.onSnapshotChanged(applySnapshot)
    void Promise.all([loadConfig(), loadAuthSnapshot().then(applySnapshot)]).finally(() => {
      setIsLoading(false)
    })
    return unsubscribe
    // 根窗口初始化与订阅只装配一次；现有 config loader 尚不是稳定回调。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isLoading }
}
