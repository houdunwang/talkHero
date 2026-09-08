import { describe, expect, it } from 'vitest'
import { TaskRegistry } from './task-registry'

describe('TaskRegistry', () => {
  it('rejects illegal transitions and never turns a terminal task back into success', () => {
    const registry = new TaskRegistry()
    registry.create('job-1', 'test.complete')
    registry.transition('job-1', 'running', { stage: 'prepare', progress: 5 })
    registry.transition('job-1', 'failed', { stage: 'worker-exited', progress: 5 })
    expect(() =>
      registry.transition('job-1', 'completed', { stage: 'done', progress: 100 })
    ).toThrow('非法任务状态转换')
    expect(registry.get('job-1')?.state).toBe('failed')
  })

  it('restores interrupted work to a safe failed or uncertain state', () => {
    const restored = TaskRegistry.restore([
      {
        id: 'queued',
        operation: 'test.wait',
        outputRelativePath: null,
        state: 'queued',
        stage: 'waiting',
        progress: 0
      },
      {
        id: 'running',
        operation: 'video.lipsync',
        outputRelativePath: null,
        state: 'running',
        stage: 'lip-sync',
        progress: 61
      },
      {
        id: 'cancelling',
        operation: 'test.wait',
        outputRelativePath: null,
        state: 'cancelling',
        stage: 'cancel',
        progress: 61
      },
      {
        id: 'done',
        operation: 'voice.synthesize',
        outputRelativePath: 'outputs/audio/123e4567-e89b-42d3-a456-426614174000.wav',
        state: 'completed',
        stage: 'done',
        progress: 100
      }
    ])
    expect(restored.get('queued')?.state).toBe('failed')
    expect(restored.get('running')?.state).toBe('failed')
    expect(restored.get('cancelling')?.state).toBe('cancelled')
    expect(restored.get('done')?.state).toBe('completed')
  })

  it('updates progress without inventing a state transition', () => {
    const registry = new TaskRegistry()
    registry.create('job-progress', 'test.complete')
    registry.transition('job-progress', 'running', { stage: 'prepare', progress: 1 })
    registry.updateProgress('job-progress', { stage: 'render', progress: 42 })
    expect(registry.get('job-progress')).toMatchObject({
      state: 'running',
      stage: 'render',
      progress: 42
    })
  })

  it('ignores progress that arrives after cancellation begins', () => {
    const registry = new TaskRegistry()
    registry.create('job-cancelling', 'test.wait')
    registry.transition('job-cancelling', 'running', { stage: 'render', progress: 42 })
    registry.transition('job-cancelling', 'cancelling', { stage: 'cancelling', progress: 42 })

    expect(
      registry.updateProgress('job-cancelling', { stage: 'late-progress', progress: 60 })
    ).toMatchObject({ state: 'cancelling', stage: 'cancelling', progress: 42 })
  })

  it('persists the operation and managed output identity for completed tasks', () => {
    const registry = new TaskRegistry()
    const id = '123e4567-e89b-42d3-a456-426614174010'
    registry.create(id, 'video.lipsync')
    registry.transition(id, 'running', { stage: 'render', progress: 1 })
    ;(
      registry as unknown as {
        attachOutput: (id: string, relativePath: string) => void
      }
    ).attachOutput(id, `outputs/video/${id}.mp4`)
    registry.transition(id, 'completed', { stage: 'completed', progress: 100 })

    expect(registry.get(id)).toMatchObject({
      operation: 'video.lipsync',
      outputRelativePath: `outputs/video/${id}.mp4`
    })
  })

  it('emits snapshots after mutations so task state can be journaled', () => {
    const changes: string[][] = []
    const registry = new TaskRegistry((tasks) => changes.push(tasks.map((task) => task.state)))
    registry.create('job-persist', 'test.complete')
    registry.transition('job-persist', 'running', { stage: 'run', progress: 1 })
    expect(changes).toEqual([['queued'], ['running']])
  })
})
