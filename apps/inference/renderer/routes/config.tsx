import { Card } from '@/renderer/shadcn/ui/card'
import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import type {
  EnvironmentSnapshot,
  ManagedResourceName,
  TaskSummary
} from '@apps/inference/types/public'
import { createFileRoute } from '@tanstack/react-router'
import { CircleAlert, Cpu, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/inference/config')({ component: RouteComponent })

const RESOURCE_NAMES: Record<ManagedResourceName, string> = {
  python: 'Python 3.11',
  'index-tts': 'IndexTTS 2.5',
  'muse-talk': 'MuseTalk 1.5',
  asr: '语音识别',
  ffmpeg: 'FFmpeg',
  browser: '受管浏览器'
}

function RouteComponent() {
  const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null)
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const refresh = () => {
      void window.inference
        .getEnvironment()
        .then((result) => {
          if (result.ok) {
            setEnvironment(result.data)
            setError('')
          } else setError(result.message)
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : '读取推理环境失败')
        })
      void window.inference
        .getTasks()
        .then((result) => {
          if (result.ok) setTasks(result.data)
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : '读取本地任务失败')
        })
    }
    refresh()
    const timer = window.setInterval(refresh, 1_500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <SettingLayout>
      <section className="space-y-3 text-accent-foreground">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Cpu className="size-5 text-sky-600" /> 本地推理环境
          </div>
          {error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlert className="size-4" /> {error}
            </div>
          ) : !environment ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> 正在检测…
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p>{environment.message}</p>
              <p className="text-muted-foreground">
                {environment.gpu.name ?? '未检测到 NVIDIA 显卡'} · 显存{' '}
                {environment.gpu.vramGb === null ? '未知' : `${environment.gpu.vramGb} GB`} · CUDA{' '}
                {environment.gpu.cuda ? '可用' : '不可用'}
              </p>
            </div>
          )}
        </Card>

        {environment && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-5 text-emerald-600" /> 受管资源
              </div>
              <span className="text-xs text-muted-foreground">
                Worker 协议 {environment.worker.protocolVersion}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {environment.resources.map((resource) => (
                <div
                  key={resource.name}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p>{RESOURCE_NAMES[resource.name]}</p>
                    <p className="text-xs text-muted-foreground">
                      {resource.version ?? '版本待发布'} ·{' '}
                      {resource.sizeBytes > 0
                        ? `${(resource.sizeBytes / 1024 ** 3).toFixed(2)} GB`
                        : '大小待发布'}{' '}
                      ·{' '}
                      {resource.licenseName && resource.licenseUrl ? (
                        <a
                          className="underline underline-offset-2"
                          href={resource.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {resource.licenseName}
                        </a>
                      ) : (
                        '许可证待审计'
                      )}
                    </p>
                  </div>
                  <span
                    className={resource.installed ? 'text-emerald-600' : 'text-muted-foreground'}
                  >
                    {resource.installed ? '已安装' : resource.installable ? '待安装' : '清单未就绪'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{environment.resourceInstall.message}</span>
                <span>
                  {environment.resourceInstall.totalBytes > 0
                    ? `${Math.round(
                        (environment.resourceInstall.completedBytes /
                          environment.resourceInstall.totalBytes) *
                          100
                      )}%`
                    : '—'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{
                    width:
                      environment.resourceInstall.totalBytes > 0
                        ? `${Math.min(
                            100,
                            (environment.resourceInstall.completedBytes /
                              environment.resourceInstall.totalBytes) *
                              100
                          )}%`
                        : '0%'
                  }}
                />
              </div>
              {environment.resourceInstall.state === 'running' ? (
                <button
                  className="w-full rounded-lg border px-4 py-2 text-sm"
                  onClick={() =>
                    void window.inference
                      .cancelResourceInstall()
                      .then((result) => {
                        if (!result.ok) setError(result.message)
                      })
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : '取消资源安装失败')
                      })
                  }
                >
                  取消安装
                </button>
              ) : (
                <button
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
                  disabled={
                    environment.resourceInstall.state === 'unavailable' ||
                    !environment.targetPlatform ||
                    !environment.gpu.detected ||
                    environment.resources.every((resource) => resource.installed)
                  }
                  onClick={() =>
                    void window.inference
                      .installResources()
                      .then((result) => {
                        if (!result.ok) setError(result.message)
                      })
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : '启动资源安装失败')
                      })
                  }
                >
                  {environment.resourceInstall.state === 'failed' ||
                  environment.resourceInstall.state === 'cancelled'
                    ? '重试安装所需资源'
                    : '安装所需资源'}
                </button>
              )}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-3 font-medium">本地任务</div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无任务</p>
          ) : (
            <div className="space-y-2">
              {[...tasks]
                .reverse()
                .slice(0, 20)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{task.operation}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.stage} · {Math.round(task.progress)}% · {task.state}
                      </p>
                    </div>
                    {['queued', 'running', 'waiting-user'].includes(task.state) && (
                      <button
                        className="shrink-0 rounded border px-3 py-1 text-xs"
                        onClick={() => void window.inference.cancelTask(task.id)}
                      >
                        取消
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>
      </section>
    </SettingLayout>
  )
}
