import { Button } from '@/renderer/shadcn/ui/button'
import { Spinner } from '@/renderer/shadcn/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/renderer/shadcn/ui/tooltip'
import { useSetAtom } from 'jotai'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LoginQr } from '../../types/public'
import { authAtom, softAtom } from '../state'

export const WechatLoginQr = (): React.JSX.Element => {
  const setAuth = useSetAtom(authAtom)
  const setSoft = useSetAtom(softAtom)
  const [qr, setQr] = useState<LoginQr | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')
  const [checkError, setCheckError] = useState('')
  const generationRef = useRef(0)
  const checkingRef = useRef(false)

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current
    checkingRef.current = false
    setLoading(true)
    setExpired(false)
    setError('')
    setCheckError('')
    await window.auth.cancelLogin()
    if (generationRef.current !== generation) return
    const result = await window.auth.createLoginQr()
    if (generationRef.current !== generation) return
    setLoading(false)
    if (!result.ok) {
      setQr(null)
      setError(result.message)
      return
    }
    setQr(result.data)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    return () => {
      window.clearTimeout(timeoutId)
      generationRef.current += 1
      void window.auth.cancelLogin()
    }
  }, [refresh])

  useEffect(() => {
    if (!qr || expired) return
    const generation = generationRef.current
    const intervalId = window.setInterval(() => {
      if (Date.now() >= qr.expiresAt) {
        setExpired(true)
        void window.auth.cancelLogin()
        return
      }
      if (checkingRef.current) return
      checkingRef.current = true
      void window.auth
        .checkLogin()
        .then((result) => {
          if (generationRef.current !== generation) return
          if (!result.ok) {
            if (result.code === 'expired' || result.code === 'no-session') setExpired(true)
            else setCheckError(result.message)
            return
          }
          setCheckError('')
          if (result.data.status === 'expired') {
            setExpired(true)
          } else if (result.data.status === 'authenticated') {
            generationRef.current += 1
            setAuth(result.data.snapshot.auth)
            setSoft(result.data.snapshot.soft)
            window.core.window.closeWindows(['setting'])
          }
        })
        .finally(() => {
          checkingRef.current = false
        })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [expired, qr, setAuth, setSoft])

  if (loading && !qr) {
    return (
      <div className="flex h-60 w-60 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-8 text-primary" /> 正在获取二维码...
      </div>
    )
  }

  if (error && !qr) {
    return <QrFallback message={error} onRefresh={refresh} loading={loading} />
  }

  if (!qr || expired) {
    return <QrFallback message="二维码已过期，请刷新后重试" onRefresh={refresh} loading={loading} />
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            <img src={qr.qrImg} alt="微信扫码登录二维码" className="h-60 w-60 object-contain" />
          </button>
        </TooltipTrigger>
        <TooltipContent>点击刷新二维码</TooltipContent>
      </Tooltip>
      {checkError && <p className="text-xs text-destructive">{checkError}，正在重试...</p>}
    </div>
  )
}

function QrFallback({
  message,
  onRefresh,
  loading
}: {
  message: string
  onRefresh: () => Promise<void>
  loading: boolean
}): React.JSX.Element {
  return (
    <div className="flex h-60 w-60 flex-col items-center justify-center gap-3 text-center">
      <RefreshCw size={30} className="text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={() => void onRefresh()} disabled={loading}>
        刷新二维码
      </Button>
    </div>
  )
}
