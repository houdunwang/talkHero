import { Card } from '@/renderer/shadcn/ui/card'
import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import { createRouteSession, useRouteSession } from '@apps/core/renderer/route-session'
import type {
  GeneratedVideoSummary,
  PublishDraft,
  SelectedPublishVideo
} from '@apps/publish/types/public'
import {
  currentScriptSession,
  initializeCurrentScript,
  lockCurrentScript,
  unlockCurrentScript,
  updateCurrentScript
} from '@apps/voice/renderer/current-script-session'
import { CircleAlert, Send } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

const SCRIPT_SESSION_KEY = 'talkhero:current-script'

export const Route = createFileRoute('/publish/workbench')({ component: PublishWorkbench })

type PublishRouteState = {
  video: SelectedPublishVideo | null
  draft: PublishDraft | null
  dirty: boolean
  busy: boolean
  error: string
  notice: string
}

const publishRouteSession = createRouteSession<PublishRouteState>({
  video: null,
  draft: null,
  dirty: false,
  busy: false,
  error: '',
  notice: ''
})

function PublishWorkbench() {
  return (
    <SettingLayout>
      <PublishWorkbenchContent />
    </SettingLayout>
  )
}

function PublishWorkbenchContent() {
  initializeCurrentScript(window.sessionStorage.getItem(SCRIPT_SESSION_KEY) ?? '')
  const remembered = useRouteSession(publishRouteSession)
  const { script, locks } = useRouteSession(currentScriptSession)
  const scriptLocked = locks.voice + locks.publish > 0
  const { video, draft, dirty, busy, error, notice } = remembered
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoSummary[]>([])
  const setBusy = (busy: boolean) => publishRouteSession.patch({ busy })
  const setError = (error: string) => publishRouteSession.patch({ error })
  const setNotice = (notice: string) => publishRouteSession.patch({ notice })

  const run = async (operation: () => Promise<void>) => {
    lockCurrentScript('publish')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败')
    } finally {
      setBusy(false)
      unlockCurrentScript('publish')
    }
  }

  useEffect(() => {
    void window.publish.listGeneratedVideos().then((result) => {
      if (result.ok) setGeneratedVideos(result.data)
      else setError(result.message)
    })
    void window.publish.listDrafts().then((result) => {
      const currentTaskId = publishRouteSession.read().video?.taskId
      const currentDraft = result.ok
        ? result.data.find((candidate) => candidate.taskId === currentTaskId)
        : null
      if (currentDraft && !publishRouteSession.read().draft) {
        publishRouteSession.patch({ draft: currentDraft, dirty: false })
      } else if (!result.ok) setError(result.message)
    })
  }, [])

  return (
    <section className="space-y-4 text-accent-foreground">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Send className="size-5 text-violet-600" /> 发布管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          为已完成的视频生成本地封面和发布文案，确认内容后再进入平台流程。
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
          <CircleAlert className="size-4" /> {error}
        </div>
      )}
      {notice && <div className="rounded-lg border p-3 text-sm">{notice}</div>}

      <Card className="space-y-3 p-5">
        <h2 className="font-medium">选择生成视频</h2>
        <select
          className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm disabled:opacity-50"
          disabled={scriptLocked}
          value={video?.taskId ?? ''}
          onChange={(event) => {
            const taskId = event.target.value
            if (!taskId) {
              publishRouteSession.patch({ video: null, draft: null, dirty: false })
              return
            }
            void run(async () => {
              const result = await window.publish.selectGeneratedVideo(taskId)
              if (!result.ok) throw new Error(result.message)
              publishRouteSession.patch({ video: result.data, draft: null, dirty: false })
              const drafts = await window.publish.listDrafts()
              if (!drafts.ok) throw new Error(drafts.message)
              publishRouteSession.patch({
                draft: drafts.data.find((candidate) => candidate.taskId === taskId) ?? null,
                dirty: false
              })
            })
          }}
        >
          <option value="">选择以前生成的视频</option>
          {generatedVideos.map((generated) => (
            <option key={generated.taskId} value={generated.taskId} disabled={!generated.available}>
              {generated.displayName}
              {generated.available ? '' : '（不可用）'}
            </option>
          ))}
        </select>
        {video && (
          <video
            className="aspect-video w-full rounded-lg bg-black"
            controls
            preload="metadata"
            src={video.previewUrl}
          />
        )}
        {generatedVideos.length === 0 && (
          <p className="text-xs text-muted-foreground">暂无可用的历史生成视频</p>
        )}
        {generatedVideos
          .filter((generated) => !generated.available)
          .map((generated) => (
            <div
              key={generated.taskId}
              className="flex items-center justify-between gap-3 text-xs text-destructive"
            >
              <span>
                {generated.displayName}：{generated.unavailableReason}
              </span>
              <button
                type="button"
                className="shrink-0 rounded border border-destructive/30 px-2 py-1"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm('仅移除这条失效任务记录，不删除其他素材，是否继续？')) return
                  void run(async () => {
                    const result = await window.publish.removeInvalidGeneratedVideo(
                      generated.taskId
                    )
                    if (!result.ok) throw new Error(result.message)
                    setGeneratedVideos((current) =>
                      current.filter((candidate) => candidate.taskId !== generated.taskId)
                    )
                    setNotice('失效生成视频记录已移除')
                  })
                }}
              >
                移除失效记录
              </button>
            </div>
          ))}
        <textarea
          className="min-h-24 w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm"
          value={script}
          disabled={scriptLocked}
          maxLength={720}
          placeholder="输入视频文案，用于生成标题、简介和封面"
          onChange={(event) => {
            updateCurrentScript(event.target.value)
            window.sessionStorage.setItem(SCRIPT_SESSION_KEY, event.target.value)
          }}
        />
        <button
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-40"
          disabled={busy || scriptLocked || !video || !script.trim()}
          onClick={() =>
            void run(async () => {
              if (!video) return
              const result = await window.publish.prepare({
                taskId: video.taskId,
                videoGrantId: video.grantId,
                script
              })
              if (!result.ok) throw new Error(result.message)
              publishRouteSession.patch({ draft: result.data, dirty: false })
              setNotice('已生成发布文案和 3 张本地封面')
            })
          }
        >
          生成封面与文案
        </button>
      </Card>

      {draft && (
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">发布草稿</h2>
            <span className="text-xs text-muted-foreground">修订 {draft.revision}</span>
          </div>
          {draft.state === 'uncertain' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              上次提交状态不确定。请先到平台作品列表人工核对；当前草稿禁止编辑、确认或重发。
            </div>
          )}
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={draft.title}
            disabled={busy || draft.state === 'uncertain'}
            maxLength={40}
            onChange={(event) => {
              const next = { ...draft, title: event.target.value, confirmed: false }
              publishRouteSession.patch({ draft: next, dirty: true })
            }}
          />
          <textarea
            className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={draft.description}
            disabled={busy || draft.state === 'uncertain'}
            maxLength={1000}
            onChange={(event) => {
              const next = { ...draft, description: event.target.value, confirmed: false }
              publishRouteSession.patch({ draft: next, dirty: true })
            }}
          />
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={draft.topics.join(' ')}
            disabled={busy || draft.state === 'uncertain'}
            onChange={(event) => {
              const next: PublishDraft = {
                ...draft,
                topics: event.target.value.split(/\s+/u).filter(Boolean),
                confirmed: false
              }
              publishRouteSession.patch({ draft: next, dirty: true })
            }}
          />
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={draft.platform ?? ''}
            disabled={busy || draft.state === 'uncertain'}
            onChange={(event) => {
              const next: PublishDraft = {
                ...draft,
                platform:
                  event.target.value === 'douyin' || event.target.value === 'xiaohongshu'
                    ? event.target.value
                    : null,
                confirmed: false
              }
              publishRouteSession.patch({ draft: next, dirty: true })
            }}
          >
            <option value="">选择发布平台</option>
            <option value="douyin">抖音</option>
            <option value="xiaohongshu">小红书</option>
          </select>
          <div className="grid grid-cols-3 gap-3">
            {draft.covers.map((cover) => (
              <button
                type="button"
                key={cover.id}
                disabled={busy || draft.state === 'uncertain'}
                className={
                  draft.selectedCoverId === cover.id
                    ? 'rounded-lg ring-2 ring-primary'
                    : 'rounded-lg opacity-70'
                }
                onClick={() => {
                  const next = { ...draft, selectedCoverId: cover.id, confirmed: false }
                  publishRouteSession.patch({ draft: next, dirty: true })
                }}
              >
                <img
                  src={cover.previewUrl}
                  alt="本地封面候选"
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
                {cover.recommended && (
                  <span className="mt-1 block text-center text-xs text-primary">推荐</span>
                )}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
              disabled={busy || !dirty || draft.state === 'uncertain'}
              onClick={() =>
                void run(async () => {
                  const result = await window.publish.updateDraft({
                    id: draft.id,
                    revision: draft.revision,
                    title: draft.title,
                    description: draft.description,
                    topics: draft.topics,
                    selectedCoverId: draft.selectedCoverId,
                    platform: draft.platform
                  })
                  if (!result.ok) throw new Error(result.message)
                  publishRouteSession.patch({ draft: result.data, dirty: false })
                  setNotice('发布草稿已保存；旧确认已失效')
                })
              }
            >
              保存草稿
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-40"
              disabled={
                busy || dirty || !draft.platform || draft.state === 'uncertain' || draft.confirmed
              }
              onClick={() =>
                void run(async () => {
                  const result = await window.publish.confirmDraft({
                    id: draft.id,
                    revision: draft.revision
                  })
                  if (!result.ok) throw new Error(result.message)
                  publishRouteSession.patch({ draft: result.data, dirty: false })
                  setNotice('本次发布资料已确认；尚未触发平台提交')
                })
              }
            >
              {draft.confirmed ? '已确认' : '确认发布资料'}
            </button>
          </div>
        </Card>
      )}
    </section>
  )
}
