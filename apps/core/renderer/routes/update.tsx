import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import { Button } from '@/renderer/shadcn/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/renderer/shadcn/ui/card'
import { Progress } from '@/renderer/shadcn/ui/progress'
import { Separator } from '@/renderer/shadcn/ui/separator'
import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { AlertCircle, CheckCircle2, CloudDownload, RefreshCw, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/core/update')({
  component: RouteComponent
})

type UpdaterState = Awaited<ReturnType<(typeof window.core.updater)['getState']>>
function RouteComponent() {
  const [state, setState] = useState<UpdaterState>()
  useEffect(() => {
    window.core.updater.getState().then((state) => {
      setState(state)
    })

    const unsubscribe = window.core.updater.onStateChanged((state) => {
      setState(state)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <SettingLayout>
      <div className="mx-auto flex w-full flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">软件更新</h1>
          <p className="text-sm text-muted-foreground">
            检查最新版本，后台下载更新，并在下载完成后安装到当前应用。安装完成后应用将自动重新打开。
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>更新状态</CardTitle>
                {/* <Badge variant={currentStatus.badgeVariant}>{currentStatus.label}</Badge> */}
              </div>
              {/* <CardDescription>{currentStatus.description}</CardDescription> */}
            </div>
            <CardAction>
              <Button
                onClick={() => {
                  if (!state) {
                    return
                  }
                  if (state.canInstallUpdate) {
                    window.core.updater.installUpdate()
                  } else {
                    window.core.updater.checkForUpdates()
                  }
                }}
                disabled={false}
              >
                {state?.canInstallUpdate ? <Rocket /> : <RefreshCw />}
                {state?.canInstallUpdate ? '立即安装' : '检查更新'}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <Card className="rounded-xl border border-border/60 bg-accent/30 p-4">
              <div className="flex items-start gap-3">
                {state?.status === 'error' ? (
                  <AlertCircle className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
                ) : state?.status === 'downloaded' ? (
                  <CheckCircle2 className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                ) : (
                  <CloudDownload
                    className="mt-0.5 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {state?.message ?? '正在读取更新状态...'}
                  </p>
                </div>
              </div>
            </Card>
            <div>
              {state?.downloadProgress != null && (
                <div>
                  <DetailItem label="下载进度" value={Math.round(state.downloadProgress) + '%'} />
                  <Progress value={state.downloadProgress} className="w-full" />
                </div>
              )}
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="当前版本" value={state?.currentVersion ?? '读取中...'} />
              <DetailItem label="最新版本" value={state?.availableVersion ?? '暂未检测到'} />
              <DetailItem
                label="最近检查"
                value={
                  state?.lastCheckedAt
                    ? dayjs(state.lastCheckedAt).format('YYYY年MM月DD日 HH:mm')
                    : '尚未检查'
                }
              />
            </div>

            {state?.downloadProgress != null && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem
                    label="发布时间"
                    value={
                      state?.releaseDate
                        ? dayjs(state.releaseDate).format('YYYY年MM月DD日 HH:mm')
                        : '未知'
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingLayout>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
