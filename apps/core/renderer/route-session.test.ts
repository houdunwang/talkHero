import { describe, expect, it } from 'vitest'
import { createRouteSession } from './route-session'

describe('route session', () => {
  it('keeps completed results available after a route component unmounts and remounts', () => {
    const session = createRouteSession({ sourceId: '', resultUrl: '', confirmed: false })
    session.patch({ sourceId: 'source-1' })
    session.patch({ resultUrl: 'talkhero-media://audio/task/output.wav' })

    expect(session.read()).toEqual({
      sourceId: 'source-1',
      resultUrl: 'talkhero-media://audio/task/output.wav',
      confirmed: false
    })
  })

  it('notifies a remounted route when an earlier async operation finishes late', () => {
    const session = createRouteSession({ resultUrl: '' })
    let latest = session.read()
    const unsubscribe = session.subscribe(() => {
      latest = session.read()
    })

    session.patch({ resultUrl: 'talkhero-media://audio/task/late.wav' })

    expect(latest.resultUrl).toBe('talkhero-media://audio/task/late.wav')
    unsubscribe()
  })

  it('keeps a route locked until the operation started by an earlier mount finishes', () => {
    const session = createRouteSession({ busy: false, resultUrl: '' })
    session.patch({ busy: true })

    const remounted = session.read()
    expect(remounted.busy).toBe(true)

    session.patch({ busy: false, resultUrl: 'talkhero-media://audio/task/finished.wav' })
    expect(session.read()).toEqual({
      busy: false,
      resultUrl: 'talkhero-media://audio/task/finished.wav'
    })
  })
})
