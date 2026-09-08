import { Card } from '@/renderer/shadcn/ui/card'
import { createRouteSession, useRouteSession } from '@apps/core/renderer/route-session'
import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import { VoiceAudioStudioContent } from '@apps/voice/renderer/routes/studio'
import type { TaskSummary } from '@apps/inference/types/public'
import type { GeneratedVideoSummary } from '@apps/publish/types/public'
import { selectLatestAvailableVideo } from '@apps/video/renderer/generated-video'
import type {
  SelectedVideoSource,
  VideoInspection,
  VideoWorkspaceSnapshot
} from '@apps/video/types/public'
import { createFileRoute } from '@tanstack/react-router'
import { CircleAlert, Film, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/video/workbench')({ component: VideoWorkbench })

type VideoRouteState = {
  source: SelectedVideoSource | null
  inspection: VideoInspection | null
  authorized: boolean
  busy: boolean
  error: string
  notice: string
}

const videoRouteSession = createRouteSession<VideoRouteState>({
  source: null,
  inspection: null,
  authorized: false,
  busy: false,
  error: '',
  notice: ''
})

function VideoWorkbench() {
  const remembered = useRouteSession(videoRouteSession)
  const [workspace, setWorkspace] = useState<VideoWorkspaceSnapshot | null>(null)
  const { source, inspection, authorized, busy, error, notice } = remembered
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null)
  const [latestVideo, setLatestVideo] = useState<GeneratedVideoSummary | null>(null)
  const setBusy = (busy: boolean) => videoRouteSession.patch({ busy })
  const setError = (error: string) => videoRouteSession.patch({ error })
  const setNotice = (notice: string) => videoRouteSession.patch({ notice })

  const run = async (operation: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void window.video.getWorkspace().then((result) => {
      if (result.ok) setWorkspace(result.data)
      else setError(result.message)
    })
  }, [])

  useEffect(() => {
    let active = true
    const refresh = () => {
      void window.publish
        .listGeneratedVideos()
        .then((result) => {
          if (!active) return
          if (!result.ok) {
            setError(result.message)
            return
          }
          setLatestVideo(selectLatestAvailableVideo(result.data))
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : '读取生成视频失败')
        })
    }
    refresh()
    const timer = window.setInterval(refresh, 1_500)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const refresh = () => {
      void window.inference.getTasks().then((result) => {
        if (!result.ok) return
        setActiveTask(
          [...result.data]
            .reverse()
            .find(
              (task) =>
                task.operation.startsWith('video.') &&
                ['queued', 'running', 'waiting-user', 'cancelling'].includes(task.state)
            ) ?? null
        )
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 1_500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <SettingLayout>
      <div className="space-y-10">
        <VoiceAudioStudioContent />
        <section className="space-y-4 text-accent-foreground">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Film className="size-5 text-sky-600" /> 视频对口型
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              检查 A 视频并只处理目标人物嘴部及自然融合所需的最小邻域。
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
              <CircleAlert className="size-4" /> {error}
            </div>
          )}
          {notice && <div className="rounded-lg border p-3 text-sm">{notice}</div>}
          {activeTask && (
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>
                {activeTask.stage} · {Math.round(activeTask.progress)}%
              </span>
              {activeTask.state !== 'cancelling' && (
                <button
                  className="rounded border px-3 py-1 text-xs"
                  onClick={() => void window.inference.cancelTask(activeTask.id)}
                >
                  取消任务
                </button>
              )}
            </div>
          )}

          {!workspace ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> 正在读取视频能力…
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card className="space-y-4 p-5">
                <h2 className="font-medium">A 视频质检</h2>
                <button
                  className="w-full rounded-lg border px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await window.video.selectSource()
                      if (!result.ok) throw new Error(result.message)
                      videoRouteSession.patch({ source: result.data, inspection: null })
                    })
                  }
                >
                  {source?.displayName ?? '选择不超过 3 分钟的 A 视频'}
                </button>
                <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(event) => {
                      videoRouteSession.patch({ authorized: event.target.checked })
                    }}
                  />
                  我确认已获得视频中人物的人脸与内容处理授权
                </label>
                <button
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-40"
                  disabled={busy || !source || !authorized}
                  onClick={() =>
                    void run(async () => {
                      if (!source) return
                      const result = await window.video.inspect({
                        grantId: source.grantId,
                        authorized
                      })
                      if (!result.ok) throw new Error(result.message)
                      videoRouteSession.patch({ inspection: result.data })
                      setNotice('媒体质检完成；人物检测未就绪时不会启动口型生成')
                    })
                  }
                >
                  开始质检
                </button>
                {inspection && (
                  <div className="rounded-lg border p-3 text-sm">
                    <p>
                      {inspection.width}×{inspection.height} ·{' '}
                      {inspection.durationSeconds.toFixed(1)} 秒
                    </p>
                    <p className="mt-1 text-muted-foreground">{inspection.reason}</p>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-emerald-600" /> 当前处理边界
                </h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>A 视频上限：{workspace.maxDurationSeconds / 60} 分钟</li>
                  <li>音轨策略：保留环境声并混音 / 替换原音轨</li>
                  <li>源文件只读，生成结果写入新文件</li>
                  <li>人物检测或最小嘴部融合未就绪时保持 fail-closed</li>
                </ul>
              </Card>
            </div>
          )}
          {latestVideo?.previewUrl && (
            <Card className="space-y-3 p-5">
              <div>
                <h2 className="font-medium">当前生成视频</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  生成完成后会自动切换到最新结果，也可前往“发布视频”选择历史视频。
                </p>
              </div>
              <video
                className="aspect-video w-full rounded-lg bg-black"
                controls
                preload="metadata"
                src={latestVideo.previewUrl}
              />
            </Card>
          )}
        </section>
      </div>
    </SettingLayout>
  )
}
