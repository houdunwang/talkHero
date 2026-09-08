import type { EnvironmentSnapshot, TaskSummary } from '@apps/inference/types/public'
import type { PublishCapabilitySnapshot } from '@apps/publish/types/public'
import type { PublishDraft, SelectedPublishVideo } from '@apps/publish/types/public'
import type { VoiceLibrarySnapshot } from '@apps/voice/types/public'
import type { SelectedVoiceReference } from '@apps/voice/types/public'
import type { VideoWorkspaceSnapshot } from '@apps/video/types/public'
import type { SelectedVideoSource, VideoInspection } from '@apps/video/types/public'
import { createFileRoute } from '@tanstack/react-router'
import {
  CheckCircle2,
  CircleAlert,
  Cpu,
  FileAudio,
  Film,
  LoaderCircle,
  MicVocal,
  Send,
  ShieldCheck
} from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/video/workbench')({ component: Workbench })

type Snapshot = {
  environment: EnvironmentSnapshot
  voices: VoiceLibrarySnapshot
  video: VideoWorkspaceSnapshot
  publish: PublishCapabilitySnapshot
}

const STEPS = [
  { icon: Cpu, title: '运行环境', description: '检测 GPU、Worker、模型与媒体工具' },
  { icon: FileAudio, title: '本地音色', description: '用获授权的 B 视频创建可复用音色' },
  { icon: MicVocal, title: '文案音频', description: '选择音色、语气与语速，先试听再确认' },
  { icon: Film, title: '口型视频', description: '只处理 A 视频人物嘴部和必要过渡区' },
  { icon: Send, title: '发布准备', description: '生成封面与文案，逐次确认后发布' }
] as const

function Workbench() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [voiceReference, setVoiceReference] = useState<SelectedVoiceReference | null>(null)
  const [voiceName, setVoiceName] = useState('我的音色')
  const [authorized, setAuthorized] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [profileName, setProfileName] = useState('')
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('')
  const [script, setScript] = useState('')
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [videoSource, setVideoSource] = useState<SelectedVideoSource | null>(null)
  const [inspection, setInspection] = useState<VideoInspection | null>(null)
  const [publishVideo, setPublishVideo] = useState<SelectedPublishVideo | null>(null)
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null)
  const [publishDirty, setPublishDirty] = useState(false)

  const refreshVoices = async () => {
    const result = await window.voice.getLibrary()
    if (result.ok) {
      setSnapshot((current) => (current ? { ...current, voices: result.data } : current))
      if (!profileId && result.data.profiles[0]) {
        setProfileId(result.data.profiles[0].id)
        setProfileName(result.data.profiles[0].name)
      }
    }
  }

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
    let active = true
    Promise.all([
      window.inference.getEnvironment(),
      window.voice.getLibrary(),
      window.video.getWorkspace(),
      window.publish.getCapability()
    ])
      .then(([environment, voices, video, publish]) => {
        if (!active) return
        const failed = [environment, voices, video, publish].find((result) => !result.ok)
        if (failed && !failed.ok) {
          setError(failed.message)
          return
        }
        if (environment.ok && voices.ok && video.ok && publish.ok) {
          setSnapshot({
            environment: environment.data,
            voices: voices.data,
            video: video.data,
            publish: publish.data
          })
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '工作台初始化失败')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void window.publish.listDrafts().then((result) => {
      if (result.ok && result.data[0]) setPublishDraft(result.data[0])
    })
  }, [])

  useEffect(() => {
    const refresh = () => {
      void window.inference.getTasks().then((result) => {
        if (result.ok) setTasks(result.data)
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 1_500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="drag flex h-14 items-center justify-between border-b border-white/10 px-7">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-amber-300 font-black text-zinc-950">
            T
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">TalkHero</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              Local video studio
            </div>
          </div>
        </div>
        <div className="no-drag flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400">
          <ShieldCheck className="size-3.5 text-emerald-400" /> 素材默认仅保存在本机
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-7 py-8">
        <div className="mb-8 flex items-end justify-between gap-8">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-amber-300">
              Create · Sync · Publish
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
              让原视频保持原样，
              <br />
              只让嘴型准确说出新文案。
            </h1>
          </div>
          <div className="max-w-sm text-sm leading-6 text-zinc-400">
            IndexTTS 2.5 负责本地音色与语音，MuseTalk 1.5 在 256×256
            内部区域生成口型，最终只融合嘴部最小邻域。
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-200">
            <CircleAlert className="size-5" />
            {error}
          </div>
        ) : !snapshot ? (
          <div className="flex h-56 items-center justify-center gap-3 text-sm text-zinc-400">
            <LoaderCircle className="size-5 animate-spin" />
            正在读取本地环境…
          </div>
        ) : (
          <>
            <div
              className={`mb-7 flex items-start gap-4 rounded-2xl border p-5 ${snapshot.environment.computeMode === 'unsupported' ? 'border-amber-300/20 bg-amber-300/10' : 'border-emerald-400/20 bg-emerald-400/10'}`}
            >
              {snapshot.environment.computeMode === 'unsupported' ? (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
              )}
              <div>
                <div className="mb-1 text-sm font-medium">
                  {snapshot.environment.computeMode === 'unsupported'
                    ? '当前设备不提供完整推理'
                    : '本地推理环境检测'}
                </div>
                <div className="text-sm leading-6 text-zinc-400">
                  {snapshot.environment.message}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, description }, index) => {
                const enabled = index === 0 && snapshot.environment.computeMode !== 'unsupported'
                return (
                  <article
                    key={title}
                    className="min-h-48 rounded-2xl border border-white/10 bg-zinc-900/70 p-5"
                  >
                    <div className="mb-8 flex items-center justify-between">
                      <div
                        className={`grid size-10 place-items-center rounded-xl ${enabled ? 'bg-amber-300 text-zinc-950' : 'bg-white/5 text-zinc-400'}`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="text-xs tabular-nums text-zinc-600">0{index + 1}</span>
                    </div>
                    <h2 className="mb-2 text-base font-semibold">{title}</h2>
                    <p className="text-sm leading-6 text-zinc-500">{description}</p>
                  </article>
                )
              })}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <h2 className="mb-4 font-semibold">创建本地音色</h2>
                <button
                  className="no-drag mb-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-sm hover:bg-white/5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await window.voice.selectReference()
                      if (!result.ok) throw new Error(result.message)
                      setVoiceReference(result.data)
                    })
                  }
                >
                  {voiceReference?.displayName ?? '选择 10～60 秒 B 视频'}
                </button>
                <input
                  className="mb-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none"
                  value={voiceName}
                  maxLength={40}
                  onChange={(event) => setVoiceName(event.target.value)}
                />
                <label className="mb-4 flex items-start gap-2 text-xs leading-5 text-zinc-400">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(event) => setAuthorized(event.target.checked)}
                  />
                  我确认已获得素材中人物的人脸与人声授权
                </label>
                <button
                  className="w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
                  disabled={busy || !voiceReference || !authorized}
                  onClick={() =>
                    void run(async () => {
                      if (!voiceReference) return
                      const result = await window.voice.createProfile({
                        grantId: voiceReference.grantId,
                        name: voiceName,
                        authorized
                      })
                      if (!result.ok) throw new Error(result.message)
                      setVoiceReference(null)
                      setProfileId(result.data.id)
                      setProfileName(result.data.name)
                      await refreshVoices()
                      setNotice(`音色“${result.data.name}”已保存到本机`)
                    })
                  }
                >
                  创建音色
                </button>
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <h2 className="mb-4 font-semibold">生成文案音频</h2>
                <select
                  className="mb-3 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm"
                  value={profileId}
                  onChange={(event) => {
                    const id = event.target.value
                    setProfileId(id)
                    setProfileName(
                      snapshot.voices.profiles.find((profile) => profile.id === id)?.name ?? ''
                    )
                    setVoicePreviewUrl('')
                  }}
                >
                  <option value="">选择音色</option>
                  {snapshot.voices.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                {profileId && (
                  <>
                    <input
                      className="mb-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none"
                      value={profileName}
                      maxLength={40}
                      onChange={(event) => setProfileName(event.target.value)}
                    />
                    <div className="mb-3 grid grid-cols-4 gap-2">
                      <button
                        className="rounded-lg border border-white/10 px-2 py-2 text-xs"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const result = await window.voice.previewProfile(profileId)
                            if (!result.ok) throw new Error(result.message)
                            setVoicePreviewUrl(result.data.previewUrl)
                          })
                        }
                      >
                        试听音色
                      </button>
                      <button
                        className="rounded-lg border border-white/10 px-2 py-2 text-xs"
                        disabled={busy || !profileName.trim()}
                        onClick={() =>
                          void run(async () => {
                            const result = await window.voice.renameProfile({
                              profileId,
                              name: profileName
                            })
                            if (!result.ok) throw new Error(result.message)
                            await refreshVoices()
                            setNotice('音色名称已更新')
                          })
                        }
                      >
                        重命名
                      </button>
                      <button
                        className="rounded-lg border border-white/10 px-2 py-2 text-xs disabled:opacity-40"
                        disabled={busy || !voiceReference || !authorized || !profileName.trim()}
                        onClick={() =>
                          void run(async () => {
                            if (!voiceReference) return
                            const result = await window.voice.updateProfile({
                              profileId,
                              grantId: voiceReference.grantId,
                              name: profileName,
                              authorized
                            })
                            if (!result.ok) throw new Error(result.message)
                            setVoiceReference(null)
                            setVoicePreviewUrl('')
                            await refreshVoices()
                            setNotice('音色参考已原子更新')
                          })
                        }
                      >
                        用 B 视频更新
                      </button>
                      <button
                        className="rounded-lg border border-red-400/20 px-2 py-2 text-xs text-red-200 disabled:opacity-40"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !window.confirm(
                              '删除后将清除该音色的本地参考音频、转写和特征，是否继续？'
                            )
                          )
                            return
                          void run(async () => {
                            const result = await window.voice.deleteProfile(profileId)
                            if (!result.ok) throw new Error(result.message)
                            setProfileId('')
                            setProfileName('')
                            setVoicePreviewUrl('')
                            await refreshVoices()
                            setNotice('音色及其受管派生文件已删除')
                          })
                        }}
                      >
                        删除
                      </button>
                    </div>
                    {voicePreviewUrl && (
                      <audio className="mb-3 w-full" controls src={voicePreviewUrl} />
                    )}
                  </>
                )}
                <textarea
                  className="mb-3 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                  value={script}
                  maxLength={720}
                  placeholder="输入不超过三分钟的独立文案"
                  onChange={(event) => setScript(event.target.value)}
                />
                <button
                  className="w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
                  disabled={busy || !profileId || !script.trim()}
                  onClick={() =>
                    void run(async () => {
                      const result = await window.voice.synthesize({
                        profileId,
                        text: script,
                        speed: 1,
                        emotion: 'natural'
                      })
                      if (!result.ok) throw new Error(result.message)
                      setAudioPreviewUrl(result.data.previewUrl)
                      setNotice(`音频生成完成，任务 ${result.data.taskId.slice(0, 8)}`)
                    })
                  }
                >
                  生成音频
                </button>
                {audioPreviewUrl && (
                  <audio className="mt-3 w-full" controls src={audioPreviewUrl} />
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <h2 className="mb-4 font-semibold">A 视频质检</h2>
                <button
                  className="mb-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-sm hover:bg-white/5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await window.video.selectSource()
                      if (!result.ok) throw new Error(result.message)
                      setVideoSource(result.data)
                      setInspection(null)
                    })
                  }
                >
                  {videoSource?.displayName ?? '选择不超过 3 分钟的 A 视频'}
                </button>
                <button
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
                  disabled={busy || !videoSource || !authorized}
                  onClick={() =>
                    void run(async () => {
                      if (!videoSource) return
                      const result = await window.video.inspect({
                        grantId: videoSource.grantId,
                        authorized
                      })
                      if (!result.ok) throw new Error(result.message)
                      setInspection(result.data)
                      setNotice('媒体质检完成；人物检测未就绪时不会启动口型生成')
                    })
                  }
                >
                  开始质检
                </button>
                {inspection && (
                  <p className="mt-3 text-xs leading-5 text-amber-200">
                    {inspection.width}×{inspection.height} · {inspection.durationSeconds.toFixed(1)}{' '}
                    秒<br />
                    {inspection.reason}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <h2 className="mb-4 font-semibold">发布资料</h2>
                <button
                  className="mb-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-sm hover:bg-white/5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await window.publish.selectVideo()
                      if (!result.ok) throw new Error(result.message)
                      setPublishVideo(result.data)
                      setPublishDraft(null)
                      setPublishDirty(false)
                    })
                  }
                >
                  {publishVideo?.displayName ?? '选择已生成的 MP4'}
                </button>
                <button
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
                  disabled={busy || !publishVideo || !script.trim()}
                  onClick={() =>
                    void run(async () => {
                      if (!publishVideo) return
                      const result = await window.publish.prepare({
                        taskId: publishVideo.taskId,
                        videoGrantId: publishVideo.grantId,
                        script
                      })
                      if (!result.ok) throw new Error(result.message)
                      setPublishDraft(result.data)
                      setPublishDirty(false)
                      setNotice('已生成发布文案和 3 张本地封面；发布前仍需逐项确认')
                    })
                  }
                >
                  生成封面与文案
                </button>
                {publishDraft && (
                  <div className="mt-3 text-xs leading-5 text-zinc-400">
                    {publishDraft.state === 'uncertain' && (
                      <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-red-200">
                        上次提交状态不确定。请先到平台作品列表人工核对；当前草稿禁止编辑、确认或重发。
                      </div>
                    )}
                    <input
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
                      value={publishDraft.title}
                      disabled={publishDraft.state === 'uncertain'}
                      maxLength={40}
                      onChange={(event) => {
                        setPublishDraft({
                          ...publishDraft,
                          title: event.target.value,
                          confirmed: false
                        })
                        setPublishDirty(true)
                      }}
                    />
                    <textarea
                      className="mb-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
                      value={publishDraft.description}
                      disabled={publishDraft.state === 'uncertain'}
                      maxLength={1000}
                      onChange={(event) => {
                        setPublishDraft({
                          ...publishDraft,
                          description: event.target.value,
                          confirmed: false
                        })
                        setPublishDirty(true)
                      }}
                    />
                    <input
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
                      value={publishDraft.topics.join(' ')}
                      disabled={publishDraft.state === 'uncertain'}
                      onChange={(event) => {
                        setPublishDraft({
                          ...publishDraft,
                          topics: event.target.value.split(/\s+/u).filter(Boolean),
                          confirmed: false
                        })
                        setPublishDirty(true)
                      }}
                    />
                    <select
                      className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={publishDraft.platform ?? ''}
                      disabled={publishDraft.state === 'uncertain'}
                      onChange={(event) => {
                        setPublishDraft({
                          ...publishDraft,
                          platform:
                            event.target.value === 'douyin' || event.target.value === 'xiaohongshu'
                              ? event.target.value
                              : null,
                          confirmed: false
                        })
                        setPublishDirty(true)
                      }}
                    >
                      <option value="">选择发布平台</option>
                      <option value="douyin">抖音</option>
                      <option value="xiaohongshu">小红书</option>
                    </select>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {publishDraft.covers.map((cover) => (
                        <button
                          type="button"
                          key={cover.id}
                          disabled={publishDraft.state === 'uncertain'}
                          className={
                            publishDraft.selectedCoverId === cover.id
                              ? 'rounded-lg ring-2 ring-amber-300'
                              : 'rounded-lg opacity-70'
                          }
                          onClick={() => {
                            setPublishDraft({
                              ...publishDraft,
                              selectedCoverId: cover.id,
                              confirmed: false
                            })
                            setPublishDirty(true)
                          }}
                        >
                          <img
                            src={cover.previewUrl}
                            alt="本地封面候选"
                            className="aspect-[3/4] w-full rounded-lg object-cover"
                          />
                          {cover.recommended && (
                            <span className="mt-1 block text-center text-amber-300">推荐</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="rounded-lg border border-white/10 px-3 py-2 text-zinc-100 disabled:opacity-40"
                        disabled={busy || !publishDirty || publishDraft.state === 'uncertain'}
                        onClick={() =>
                          void run(async () => {
                            const result = await window.publish.updateDraft({
                              id: publishDraft.id,
                              revision: publishDraft.revision,
                              title: publishDraft.title,
                              description: publishDraft.description,
                              topics: publishDraft.topics,
                              selectedCoverId: publishDraft.selectedCoverId,
                              platform: publishDraft.platform
                            })
                            if (!result.ok) throw new Error(result.message)
                            setPublishDraft(result.data)
                            setPublishDirty(false)
                            setNotice('发布草稿已保存；内容变更已使旧确认失效')
                          })
                        }
                      >
                        保存草稿
                      </button>
                      <button
                        className="rounded-lg bg-amber-300 px-3 py-2 font-semibold text-zinc-950 disabled:opacity-40"
                        disabled={
                          busy ||
                          publishDirty ||
                          !publishDraft.platform ||
                          publishDraft.state === 'uncertain' ||
                          publishDraft.confirmed
                        }
                        onClick={() =>
                          void run(async () => {
                            const result = await window.publish.confirmDraft({
                              id: publishDraft.id,
                              revision: publishDraft.revision
                            })
                            if (!result.ok) throw new Error(result.message)
                            setPublishDraft(result.data)
                            setNotice('本次发布资料已确认；尚未触发平台提交')
                          })
                        }
                      >
                        {publishDraft.confirmed ? '已确认' : '确认发布资料'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {(notice || busy) && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {busy
                  ? (() => {
                      const activeTask = [...tasks]
                        .reverse()
                        .find((task) =>
                          ['queued', 'running', 'waiting-user', 'cancelling'].includes(task.state)
                        )
                      if (!activeTask) return '正在启动本地任务…'
                      return (
                        <div className="flex items-center justify-between gap-4">
                          <span>
                            {activeTask.stage} · {Math.round(activeTask.progress)}%
                          </span>
                          {activeTask.state !== 'cancelling' && (
                            <button
                              className="rounded-lg border border-white/15 px-3 py-1 text-xs"
                              onClick={() => void window.inference.cancelTask(activeTask.id)}
                            >
                              取消任务
                            </button>
                          )}
                        </div>
                      )
                    })()
                  : notice}
              </div>
            )}

            <div className="mt-4 grid grid-cols-[1.35fr_1fr] gap-4">
              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">受管资源</h2>
                  <span className="text-xs text-zinc-500">
                    协议 {snapshot.environment.worker.protocolVersion}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {snapshot.environment.resources.map((resource) => (
                    <div
                      key={resource.name}
                      className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-xs"
                    >
                      <span className="text-zinc-400">{resource.name}</span>
                      <span className={resource.installed ? 'text-emerald-400' : 'text-zinc-600'}>
                        {resource.installed ? '已检测' : '未安装'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <h2 className="mb-4 font-semibold">当前边界</h2>
                <ul className="space-y-2.5 text-sm text-zinc-400">
                  <li>本地音色：{snapshot.voices.profiles.length} 个档案</li>
                  <li>A 视频上限：{snapshot.video.maxDurationSeconds / 60} 分钟</li>
                  <li>音轨策略：环境声混音 / 替换原音轨</li>
                  <li>
                    发布平台：
                    {snapshot.publish.platforms.map((platform) => platform.name).join('、')}
                  </li>
                </ul>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
