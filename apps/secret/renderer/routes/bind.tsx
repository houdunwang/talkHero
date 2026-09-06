import { cn } from '@/renderer/shadcn/lib/utils'
import { Header } from '@apps/core/renderer/components/window/Header'
import { Alert, AlertDescription } from '@/renderer/shadcn/ui/alert'
import { Button } from '@/renderer/shadcn/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/renderer/shadcn/ui/card'
import { Input } from '@/renderer/shadcn/ui/input'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight, CheckCircle2, CircleAlert, KeyRound, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { name as packageName } from '../../../../package.json'

// 购买地址固定由官网前缀与 package.json.name 组成；软件名缺失或为空时不提供购买入口
const purchaseUrl = (() => {
  const softName = packageName?.trim()
  if (!softName) return undefined
  return `https://www.houdunyun.com/core/front/soft/${encodeURIComponent(softName)}`
})()

// 该模块当前未注册到应用路由；保留路径声明，供未来重新装配时直接恢复。
export const Route = createFileRoute('/secret/bind' as never)({
  component: RouteComponent
})

function RouteComponent() {
  const [secret, setSecret] = useState('')
  const [state, setState] = useState<boolean | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  // 本次绑定结果是否为"需要购买"
  const [purchaseRequired, setPurchaseRequired] = useState(false)
  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    if (submitting || !secret) return

    setSubmitting(true)
    // 每次有效提交先清除上一轮购买分类，避免旧入口残留
    setPurchaseRequired(false)
    try {
      const res = await window.secret.bindLicense(secret)
      if (!res) return
      if (res.state) {
        toast.success(res.message)
        setState(true)
        setError(undefined)
      } else {
        setState(false)
        setError(res.message)
        setPurchaseRequired(res.reason === 'purchaseRequired')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-accent">
      <Header />
      {state === true ? (
        <BindSuccess />
      ) : (
        <div className="flex min-h-svh items-center justify-center px-6 py-10">
          <Card className="w-full max-w-xl border-0 bg-background/88 shadow-sm">
            <CardHeader className="items-center text-center">
              <div className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <KeyRound className="size-5" />
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                输入软件授权码
              </CardTitle>
              <CardDescription className="max-w-lg leading-6">
                输入授权码激活后即可使用软件。还没有授权码？请访问
                <a
                  href="https://www.houdunyun.com/core/member/secret"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  后盾云网站
                </a>
                获取。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor="license-code">
                  软件授权码
                </label>
                <Input
                  id="license-code"
                  placeholder="例如 ABCD-EFGH-IJKL-MNOP"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  disabled={submitting}
                  className={cn(
                    'h-12 rounded-2xl border-border/80 bg-accent/40 px-4 font-mono text-[15px] tracking-[0.16em] placeholder:font-sans placeholder:tracking-normal',
                    state === false &&
                      'border-destructive/40 bg-destructive/5 focus-visible:ring-destructive/30'
                  )}
                />
                {state === false && purchaseRequired ? (
                  <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10">
                    <div className="flex gap-3 px-4 py-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <ShoppingCart className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground">此授权码尚未购买当前软件</p>
                        <p className="text-sm leading-5 text-muted-foreground">
                          {error ?? '购买当前软件后，即可绑定此授权码。'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-amber-500/20 px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        购买完成后，返回此处重新激活
                      </span>
                      {purchaseUrl && (
                        <a
                          href={purchaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-800 underline underline-offset-4 transition-colors hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100"
                        >
                          去购买
                          <ArrowUpRight className="size-4" />
                        </a>
                      )}
                    </div>
                  </section>
                ) : state === false ? (
                  <Alert className="rounded-2xl border-border/80 bg-accent/40 text-muted-foreground">
                    <CircleAlert className="size-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <Button
                type="button"
                variant={secret ? 'default' : 'outline'}
                disabled={!secret || submitting}
                className="h-11 w-full rounded-2xl"
                onClick={onSubmit}
              >
                {submitting ? '激活中...' : '激活软件'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}

// 授权成功提示
function BindSuccess() {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-0 bg-background/92 shadow-sm">
        <CardHeader className="items-center px-6 pb-3 pt-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-3xl bg-primary/8 text-primary">
            <CheckCircle2 className="size-8" strokeWidth={1.8} />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">授权绑定成功</CardTitle>
          <CardDescription className="max-w-sm text-sm leading-6 text-muted-foreground">
            当前设备已可正常使用，下次打开应用时无需再次输入授权码。
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-11 flex-1 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-600/90"
              onClick={() => window.core.window.closeWindow()}
            >
              开始使用
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
