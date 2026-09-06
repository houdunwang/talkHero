import { Avatar, AvatarFallback, AvatarImage } from '@/renderer/shadcn/ui/avatar'
import { Badge } from '@/renderer/shadcn/ui/badge'
import { Button } from '@/renderer/shadcn/ui/button'
import { Card, CardContent } from '@/renderer/shadcn/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/renderer/shadcn/ui/alert-dialog'
import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useAtomValue } from 'jotai'
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LogOut,
  MessageCircle,
  ScanLine,
  ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import type { AuthView } from '../../types/public'
import { WechatLoginQr } from '../components/WechatLoginQr'
import { authAtom, softAtom } from '../state'

export const Route = createFileRoute('/auth/subscribe')({ component: RouteComponent })

function RouteComponent(): React.JSX.Element {
  const auth = useAtomValue(authAtom)
  return (
    <SettingLayout>
      <div className="mx-auto flex w-full flex-col gap-4 pt-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">账号与订阅</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全站订阅或软件单独购买任一有效，即可使用软件。
          </p>
        </div>
        {auth ? <AccountOverview auth={auth} /> : <WechatSignIn />}
      </div>
    </SettingLayout>
  )
}

function WechatSignIn(): React.JSX.Element {
  return (
    <Card className="overflow-hidden border-border/70 bg-background/80 shadow-sm">
      <CardContent className="grid min-h-[400px] p-0 md:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-between border-b border-border/70 bg-[linear-gradient(145deg,hsl(var(--accent))_0%,hsl(var(--background))_72%)] p-7 md:border-r md:border-b-0">
          <div>
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400">
              <MessageCircle className="size-5" />
            </div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              微信账号登录
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              扫码继续使用
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              登录后自动同步账号资料与订阅权益。
            </p>
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <LoginStep icon={ScanLine} text="打开微信扫一扫二维码" />
            <LoginStep icon={ShieldCheck} text="在手机上确认登录" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-7 py-7 text-center">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <ScanLine className="size-4 text-emerald-600 dark:text-emerald-400" /> 请使用微信扫码
          </div>
          <WechatLoginQr />
        </div>
      </CardContent>
    </Card>
  )
}

function AccountOverview({ auth }: { auth: AuthView }): React.JSX.Element {
  const soft = useAtomValue(softAtom)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const nickname = auth.user.nickname
  const siteSubscription = getEntitlement(auth.user.subscribeEndTime)
  const softwareSubscription = getEntitlement(soft?.subscribeEndTime || '')
  const canUse = soft?.canUse === true

  const handleLogout = async (): Promise<void> => {
    if (logoutPending) return
    setLogoutPending(true)
    setLogoutError('')
    try {
      const result = await window.auth.logout()
      if (!result.ok) {
        setLogoutError(result.message)
        setLogoutPending(false)
      }
    } catch {
      setLogoutError('退出登录失败，请稍后重试')
      setLogoutPending(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-5">
          <Avatar className="size-11 ring-2 ring-background" size="lg">
            <AvatarImage src={auth.user.avatar} alt={`${nickname}的头像`} />
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {nickname.trim().slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-semibold text-foreground">{nickname}</h2>
              <Badge
                className={
                  canUse
                    ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400'
                }
              >
                {canUse ? <CheckCircle2 /> : <CircleAlert />}
                {canUse ? '软件可用' : '已到期'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">用户 ID：{auth.user.id}</p>
          </div>
          <AlertDialog
            open={logoutOpen}
            onOpenChange={(open) => {
              if (logoutPending) return
              setLogoutOpen(open)
              if (open) setLogoutError('')
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogOut />
                退出登录
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
                <AlertDialogDescription>
                  退出后需要重新使用微信扫码登录，当前订阅账号将不再用于桌面端。
                </AlertDialogDescription>
              </AlertDialogHeader>
              {logoutError && <p className="text-sm text-destructive">{logoutError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={logoutPending}>取消</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={logoutPending}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleLogout()
                  }}
                >
                  {logoutPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
                  {logoutPending ? '正在退出…' : '确认退出'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid border-t pl-3 border-border/70 sm:grid-cols-2 sm:divide-x sm:divide-border/70">
          <EntitlementItem title="全站订阅" entitlement={siteSubscription} />
          <EntitlementItem
            title={soft?.title || '软件单独购买'}
            entitlement={softwareSubscription}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function EntitlementItem({
  title,
  entitlement
}: {
  title: string
  entitlement: Entitlement
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">到期：{entitlement.formattedEndTime}</p>
      </div>
    </div>
  )
}

function LoginStep({
  icon: Icon,
  text
}: {
  icon: typeof ScanLine
  text: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-emerald-600 shadow-sm ring-1 ring-border/70 dark:text-emerald-400">
        <Icon className="size-3.5" />
      </span>
      <span>{text}</span>
    </div>
  )
}

type Entitlement = { formattedEndTime: string }

function getEntitlement(value?: string): Entitlement {
  const endTime = dayjs(value)
  return {
    formattedEndTime: value && endTime.isValid() ? endTime.format('YYYY年MM月DD日 HH:mm') : '未开通'
  }
}
