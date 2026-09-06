import { Button } from '@/renderer/shadcn/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/renderer/shadcn/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/renderer/shadcn/ui/tooltip'
import { RefreshCw, ShoppingBag } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { PaymentQr, SubscriptionPeriod } from '../../types/public'

interface WePayProps {
  title: string
  children?: ReactNode
  period: SubscriptionPeriod
  onSuccess: () => void
}

export function WePay({ children, ...props }: WePayProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="secondary" size="lg" className="w-full rounded-none py-6 text-base">
            <ShoppingBag className="mr-2" /> 微信支付
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="mt-6 text-center text-lg">{props.title}</DialogTitle>
          <DialogDescription className="text-center">
            支付确认后将同步当前账号权益
          </DialogDescription>
        </DialogHeader>
        <PayQr {...props} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}

function PayQr({
  period,
  onSuccess,
  setOpen
}: WePayProps & { setOpen: (open: boolean) => void }): React.JSX.Element {
  const [qr, setQr] = useState<PaymentQr | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')
  const [checkError, setCheckError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const generationRef = useRef(0)
  const checkingRef = useRef(false)

  const complete = useCallback(() => {
    generationRef.current += 1
    onSuccess()
    setOpen(false)
  }, [onSuccess, setOpen])

  const createQr = useCallback(async () => {
    const generation = ++generationRef.current
    checkingRef.current = false
    setLoading(true)
    setExpired(false)
    setError('')
    setCheckError('')
    await window.auth.cancelPayment()
    if (generationRef.current !== generation) return
    const result = await window.auth.createPayment(period)
    if (generationRef.current !== generation) return
    setLoading(false)
    if (!result.ok) {
      if (result.code === 'payment-confirmed') {
        setConfirmed(true)
        setQr(null)
        return
      }
      setQr(null)
      setError(result.message)
      return
    }
    setQr(result.data)
  }, [period])

  const syncConfirmedPayment = useCallback(async () => {
    setLoading(true)
    const result = await window.auth.syncPayment()
    setLoading(false)
    if (!result.ok) {
      setCheckError(result.message)
      return
    }
    if (result.data.status === 'active') complete()
    else setCheckError('支付已确认，权益暂未同步，请稍后重试')
  }, [complete])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void createQr(), 0)
    return () => {
      window.clearTimeout(timeoutId)
      generationRef.current += 1
      void window.auth.cancelPayment()
    }
  }, [createQr])

  useEffect(() => {
    if (!qr || expired || confirmed) return
    const generation = generationRef.current
    const intervalId = window.setInterval(() => {
      if (Date.now() >= qr.expiresAt) {
        setExpired(true)
        void window.auth.cancelPayment()
        return
      }
      if (checkingRef.current) return
      checkingRef.current = true
      void window.auth
        .checkPayment()
        .then((result) => {
          if (generationRef.current !== generation) return
          if (!result.ok) {
            if (result.code === 'expired' || result.code === 'no-session') setExpired(true)
            else setCheckError(result.message)
            return
          }
          setCheckError('')
          if (result.data.status === 'expired') setExpired(true)
          else if (result.data.status === 'confirmed') setConfirmed(true)
          else if (result.data.status === 'active') complete()
        })
        .finally(() => {
          checkingRef.current = false
        })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [complete, confirmed, expired, qr])

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <RefreshCw
          className={loading ? 'size-8 animate-spin text-primary' : 'size-8 text-primary'}
        />
        <div>
          <p className="font-medium text-foreground">支付已确认，权益同步中</p>
          <p className="mt-1 text-sm text-muted-foreground">同步成功前不会再次创建订单</p>
        </div>
        {checkError && <p className="text-sm text-destructive">{checkError}</p>}
        <Button onClick={() => void syncConfirmedPayment()} disabled={loading}>
          重试同步权益
        </Button>
      </div>
    )
  }

  if (loading && !qr) return <LoadingState />
  if (error && !qr) {
    return <QrFallback message={error} onRefresh={createQr} loading={loading} />
  }
  if (!qr || expired) {
    return (
      <QrFallback message="二维码已过期，请刷新后重试" onRefresh={createQr} loading={loading} />
    )
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => void createQr()} disabled={loading}>
            <img
              src={qr.qrImg}
              alt="微信支付二维码"
              className="size-72 object-contain transition-opacity hover:opacity-80"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>点击刷新二维码</TooltipContent>
      </Tooltip>
      <p>请使用微信扫码支付</p>
      {checkError && <p className="mt-2 text-xs text-destructive">{checkError}，正在重试...</p>}
    </div>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="flex h-72 w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <RefreshCw className="size-6 animate-spin" /> 正在获取支付二维码...
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
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" onClick={() => void onRefresh()} disabled={loading}>
        刷新二维码
      </Button>
    </div>
  )
}
