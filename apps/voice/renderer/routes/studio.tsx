import { Card } from '@/renderer/shadcn/ui/card'
import { createRouteSession, useRouteSession } from '@apps/core/renderer/route-session'
import type { TaskSummary } from '@apps/inference/types/public'
import type { SelectedVoiceReference, VoiceLibrarySnapshot } from '@apps/voice/types/public'
import {
  currentScriptSession,
  initializeCurrentScript,
  lockCurrentScript,
  unlockCurrentScript,
  updateCurrentScript
} from '@apps/voice/renderer/current-script-session'
import { CircleAlert, LoaderCircle, MicVocal, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const SCRIPT_SESSION_KEY = 'talkhero:current-script'

type VoiceRouteState = {
  reference: SelectedVoiceReference | null
  voiceName: string
  authorized: boolean
  updateProfileId: string
  profileId: string
  profileName: string
  profilePreviewUrl: string
  audioPreviewUrl: string
  busy: boolean
  error: string
  notice: string
}

const voiceRouteSession = createRouteSession<VoiceRouteState>({
  reference: null,
  voiceName: '我的音色',
  authorized: false,
  updateProfileId: '',
  profileId: '',
  profileName: '',
  profilePreviewUrl: '',
  audioPreviewUrl: '',
  busy: false,
  error: '',
  notice: ''
})

function VoiceStudioContent({ section }: { section: 'profile' | 'audio' }) {
  initializeCurrentScript(window.sessionStorage.getItem(SCRIPT_SESSION_KEY) ?? '')
  const remembered = useRouteSession(voiceRouteSession)
  const { script, locks } = useRouteSession(currentScriptSession)
  const scriptLocked = locks.voice + locks.publish > 0
  const [library, setLibrary] = useState<VoiceLibrarySnapshot | null>(null)
  const {
    reference,
    voiceName,
    authorized,
    updateProfileId,
    profileId,
    profileName,
    profilePreviewUrl,
    audioPreviewUrl,
    busy,
    error,
    notice
  } = remembered
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null)
  const setBusy = (busy: boolean) => voiceRouteSession.patch({ busy })
  const setError = (error: string) => voiceRouteSession.patch({ error })
  const setNotice = (notice: string) => voiceRouteSession.patch({ notice })

  const refreshLibrary = async () => {
    const result = await window.voice.getLibrary()
    if (!result.ok) throw new Error(result.message)
    setLibrary(result.data)
    if (!profileId && result.data.profiles[0]) {
      voiceRouteSession.patch({
        profileId: result.data.profiles[0].id,
        profileName: result.data.profiles[0].name
      })
    }
  }

  const run = async (operation: () => Promise<void>) => {
    lockCurrentScript('voice')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败')
    } finally {
      setBusy(false)
      unlockCurrentScript('voice')
    }
  }

  useEffect(() => {
    let active = true
    void window.voice
      .getLibrary()
      .then((result) => {
        if (!active) return
        if (!result.ok) {
          setError(result.message)
          return
        }
        setLibrary(result.data)
        if (!voiceRouteSession.read().profileId && result.data.profiles[0]) {
          voiceRouteSession.patch({
            profileId: result.data.profiles[0].id,
            profileName: result.data.profiles[0].name
          })
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '读取音色库失败')
      })
    return () => {
      active = false
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
                task.operation.startsWith('voice.') &&
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
    <section className="space-y-4 text-accent-foreground">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          {section === 'profile' ? (
            <>
              <MicVocal className="size-5 text-amber-600" /> 视频音色
            </>
          ) : (
            <>
              <Volume2 className="size-5 text-amber-600" /> 音色库与文案音频
            </>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {section === 'profile'
            ? '从已授权的 B 视频创建或更新可复用的本地音色。'
            : '选择已保存的音色，用独立文案生成并试听语音。'}
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

      {!library ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> 正在读取本地音色…
        </div>
      ) : (
        <div className="space-y-4">
          {section === 'profile' && (
            <Card className="space-y-3 p-5">
              <h2 className="font-medium">创建或更新音色</h2>
              <select
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm"
                value={updateProfileId}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value
                  const selected = library.profiles.find((profile) => profile.id === id)
                  voiceRouteSession.patch({
                    updateProfileId: id,
                    voiceName: selected?.name ?? '我的音色'
                  })
                }}
              >
                <option value="">创建新音色</option>
                {library.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    更新：{profile.name}
                  </option>
                ))}
              </select>
              <button
                className="w-full rounded-lg border px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await window.voice.selectReference()
                    if (!result.ok) throw new Error(result.message)
                    voiceRouteSession.patch({ reference: result.data })
                  })
                }
              >
                {reference?.displayName ?? '选择 10～60 秒 B 视频'}
              </button>
              <input
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm"
                value={voiceName}
                maxLength={40}
                onChange={(event) => {
                  voiceRouteSession.patch({ voiceName: event.target.value })
                }}
              />
              <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(event) => {
                    voiceRouteSession.patch({ authorized: event.target.checked })
                  }}
                />
                我确认已获得素材中人物的人脸与人声授权
              </label>
              <button
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-40"
                disabled={busy || !reference || !authorized || !voiceName.trim()}
                onClick={() =>
                  void run(async () => {
                    if (!reference) return
                    const result = updateProfileId
                      ? await window.voice.updateProfile({
                          profileId: updateProfileId,
                          grantId: reference.grantId,
                          name: voiceName,
                          authorized
                        })
                      : await window.voice.createProfile({
                          grantId: reference.grantId,
                          name: voiceName,
                          authorized
                        })
                    if (!result.ok) throw new Error(result.message)
                    voiceRouteSession.patch({
                      reference: null,
                      updateProfileId: '',
                      profileId: result.data.id,
                      profileName: result.data.name
                    })
                    await refreshLibrary()
                    setNotice(
                      updateProfileId
                        ? `音色“${result.data.name}”已更新`
                        : `音色“${result.data.name}”已保存到本机`
                    )
                  })
                }
              >
                {updateProfileId ? '更新音色' : '创建音色'}
              </button>
            </Card>
          )}

          {section === 'audio' && (
            <Card className="space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-medium">
                <Volume2 className="size-4" /> 音色库与文案音频
              </h2>
              <select
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm"
                value={profileId}
                onChange={(event) => {
                  const id = event.target.value
                  const name = library.profiles.find((profile) => profile.id === id)?.name ?? ''
                  voiceRouteSession.patch({
                    profileId: id,
                    profileName: name,
                    profilePreviewUrl: ''
                  })
                }}
              >
                <option value="">选择音色</option>
                {library.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              {profileId && (
                <>
                  <input
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm"
                    value={profileName}
                    maxLength={40}
                    onChange={(event) => {
                      voiceRouteSession.patch({ profileName: event.target.value })
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      className="rounded-lg border px-2 py-2 text-xs"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const result = await window.voice.previewProfile(profileId)
                          if (!result.ok) throw new Error(result.message)
                          voiceRouteSession.patch({ profilePreviewUrl: result.data.previewUrl })
                        })
                      }
                    >
                      试听
                    </button>
                    <button
                      className="rounded-lg border px-2 py-2 text-xs"
                      disabled={busy || !profileName.trim()}
                      onClick={() =>
                        void run(async () => {
                          const result = await window.voice.renameProfile({
                            profileId,
                            name: profileName
                          })
                          if (!result.ok) throw new Error(result.message)
                          await refreshLibrary()
                          setNotice('音色名称已更新')
                        })
                      }
                    >
                      重命名
                    </button>
                    <button
                      className="rounded-lg border border-destructive/30 px-2 py-2 text-xs text-destructive"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm('删除该音色及本地派生文件，是否继续？')) return
                        void run(async () => {
                          const result = await window.voice.deleteProfile(profileId)
                          if (!result.ok) throw new Error(result.message)
                          voiceRouteSession.patch({
                            profileId: '',
                            profileName: '',
                            profilePreviewUrl: ''
                          })
                          await refreshLibrary()
                          setNotice('音色已删除')
                        })
                      }}
                    >
                      删除
                    </button>
                  </div>
                  {profilePreviewUrl && (
                    <audio className="w-full" controls src={profilePreviewUrl} />
                  )}
                </>
              )}
              <textarea
                className="min-h-28 w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm"
                value={script}
                disabled={scriptLocked}
                maxLength={720}
                placeholder="输入不超过三分钟的独立文案"
                onChange={(event) => {
                  updateCurrentScript(event.target.value)
                  window.sessionStorage.setItem(SCRIPT_SESSION_KEY, event.target.value)
                }}
              />
              <button
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-40"
                disabled={busy || scriptLocked || !profileId || !script.trim()}
                onClick={() =>
                  void run(async () => {
                    const result = await window.voice.synthesize({
                      profileId,
                      text: script,
                      speed: 1,
                      emotion: 'natural'
                    })
                    if (!result.ok) throw new Error(result.message)
                    voiceRouteSession.patch({ audioPreviewUrl: result.data.previewUrl })
                    setNotice(`音频生成完成，任务 ${result.data.taskId.slice(0, 8)}`)
                  })
                }
              >
                生成音频
              </button>
              {audioPreviewUrl && <audio className="w-full" controls src={audioPreviewUrl} />}
            </Card>
          )}
        </div>
      )}
    </section>
  )
}

export function VoiceProfileConfigContent() {
  return <VoiceStudioContent section="profile" />
}

export function VoiceAudioStudioContent() {
  return <VoiceStudioContent section="audio" />
}
