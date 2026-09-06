import { createFileRoute } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { WechatLoginQr } from '../components/WechatLoginQr'
import { Header } from '@apps/core/renderer/components/window/Header'

export const Route = createFileRoute('/auth/wechatLogin')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-background px-7 py-12 text-foreground">
        <section className="flex w-full max-w-[360px] flex-col items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#2aae67] text-white">
            <MessageCircle className="size-[18px]" strokeWidth={2.25} />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">微信扫码登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">请使用微信扫描二维码</p>
          <div className="mt-7 rounded-2xl border border-border bg-card p-2">
            <WechatLoginQr />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">扫码并确认，即可完成登录</p>
        </section>
      </main>
    </div>
  )
}
