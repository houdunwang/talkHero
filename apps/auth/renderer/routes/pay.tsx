import { Badge } from '@/renderer/shadcn/ui/badge'
import { Button } from '@/renderer/shadcn/ui/button'
import { Card, CardContent } from '@/renderer/shadcn/ui/card'
import { Header } from '@apps/core/renderer/components/window/Header'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { WePay } from '../components/WePay'

export const Route = createFileRoute('/auth/pay')({
  component: RouteComponent
})

function RouteComponent(): React.JSX.Element {
  const [soft, setSoft] = useState<Soft | null>(null)
  const [isLoadingSoft, setIsLoadingSoft] = useState(true)
  const [softLoadFailed, setSoftLoadFailed] = useState(false)
  const [hasOnlineOptions, setHasOnlineOptions] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const snapshot = await window.auth.getSnapshot()
      if (!cancelled && snapshot.ok) setSoft(snapshot.data.soft)

      const paymentState = await window.auth.getPaymentState()
      if (cancelled) return
      if (paymentState.ok && paymentState.data.confirmed) {
        setPaymentConfirmed(true)
        setIsLoadingSoft(false)
        return
      }

      const options = await window.auth.getPurchaseOptions()

      if (cancelled) return
      if (options.ok) {
        setSoft(options.data.soft)
        setHasOnlineOptions(true)
        setPaymentConfirmed(options.data.paymentConfirmed)
        setSoftLoadFailed(false)
      } else {
        setHasOnlineOptions(false)
        setSoftLoadFailed(true)
      }
      setIsLoadingSoft(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const softwareTitle = soft?.title || '后盾云桌面助手'
  const isFreeSoft = soft?.free === true
  const isActiveSoft = soft?.canUse === true

  const handleSuccess = (): void => {
    toast.success('支付成功，订阅权益已生效')
    window.core.window.windowShow('setting')
    window.core.window.closeWindow()
  }

  return (
    <div className="h-svh overflow-hidden bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.1),transparent_32rem)]">
      <Header />
      <main className="flex h-full min-h-0 items-center justify-center px-6 py-8">
        <section className="w-full max-w-3xl">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-primary">订阅服务</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              选择适合你的使用方式
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              开通后即可使用 {softwareTitle} 的完整功能。
            </p>
          </div>

          {paymentConfirmed ? (
            <ConfirmedSubscription onSuccess={handleSuccess} />
          ) : (isFreeSoft || isActiveSoft) && hasOnlineOptions ? (
            <div className="mt-7 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-6 text-center">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {isFreeSoft ? '当前软件可免费使用，无需订阅。' : '当前订阅权益已生效。'}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  window.core.window.windowShow('setting')
                  window.core.window.closeWindow()
                }}
              >
                开始使用
              </Button>
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-2 gap-4">
              <SubscriptionOption
                title="月订阅"
                description="按月续订，使用更灵活"
                price={soft?.monthlyPrice}
                period="每月"
                icon={CalendarDays}
                action={
                  <WePay
                    title={`${softwareTitle} · 月订阅`}
                    period="month"
                    onSuccess={handleSuccess}
                  >
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-xl"
                      disabled={isLoadingSoft || !hasOnlineOptions}
                    >
                      选择月订阅
                    </Button>
                  </WePay>
                }
              />
              <SubscriptionOption
                title="年订阅"
                description="一次开通，长期使用更省心"
                price={soft?.yearlyPrice}
                period="每年"
                icon={Sparkles}
                featured
                action={
                  <WePay
                    title={`${softwareTitle} · 年订阅`}
                    period="year"
                    onSuccess={handleSuccess}
                  >
                    <Button
                      className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
                      disabled={isLoadingSoft || !hasOnlineOptions}
                    >
                      选择年订阅
                    </Button>
                  </WePay>
                }
              />
            </div>
          )}

          {softLoadFailed && (
            <p className="mt-4 text-center text-sm text-destructive">
              当前仅显示上次保存的资料，无法确认最新报价，购买入口已停用。
            </p>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            支付完成后，权益会自动同步到当前账号
          </div>
        </section>
      </main>
    </div>
  )
}

function ConfirmedSubscription({ onSuccess }: { onSuccess: () => void }): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('支付已确认，正在等待权益同步。')

  const sync = async (): Promise<void> => {
    setLoading(true)
    const result = await window.auth.syncPayment()
    setLoading(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    if (result.data.status === 'active') onSuccess()
    else setMessage('支付已确认，权益暂未同步，请稍后重试。')
  }

  return (
    <div className="mt-7 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-6 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      <Button className="mt-4" onClick={() => void sync()} disabled={loading}>
        {loading ? '正在同步...' : '重试同步权益'}
      </Button>
    </div>
  )
}

type SubscriptionOptionProps = {
  title: string
  description: string
  price?: string
  period: string
  icon: typeof CalendarDays
  featured?: boolean
  action: React.ReactNode
}

function SubscriptionOption({
  title,
  description,
  price,
  period,
  icon: Icon,
  featured = false,
  action
}: SubscriptionOptionProps): React.JSX.Element {
  return (
    <Card
      className={
        featured
          ? 'relative overflow-hidden rounded-[22px] border-primary/35 bg-primary/[0.045] shadow-lg shadow-primary/10'
          : 'rounded-[22px] border-border/70 bg-background/80 shadow-sm'
      }
    >
      {featured && (
        <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground hover:bg-primary">
          推荐
        </Badge>
      )}
      <CardContent className="flex min-h-[248px] flex-col p-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="mt-5 flex items-end gap-1 text-foreground">
          <span className="text-sm font-medium">¥</span>
          <span className="text-3xl font-semibold tracking-tight">{price || '--'}</span>
          <span className="mb-1 text-sm text-muted-foreground">/ {period}</span>
        </div>
        <div className="mt-auto pt-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            微信扫码，安全支付
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  )
}
