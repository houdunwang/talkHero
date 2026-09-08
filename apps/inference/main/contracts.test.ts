import { describe, expect, it } from 'vitest'
import {
  PROTOCOL_VERSION,
  canTransitionTask,
  classifyComputeMode,
  parseWorkerMessage,
  resolveManagedPath
} from './contracts'

describe('inference contracts', () => {
  it('rejects malformed or incompatible worker messages', () => {
    expect(() => parseWorkerMessage({ version: '0', type: 'ready' })).toThrow('协议版本不匹配')
    expect(() =>
      parseWorkerMessage({ version: PROTOCOL_VERSION, type: 'progress', progress: 101 })
    ).toThrow('Worker 消息无效')
    expect(parseWorkerMessage({ version: PROTOCOL_VERSION, type: 'ready' })).toEqual({
      version: PROTOCOL_VERSION,
      type: 'ready'
    })
  })

  it('only allows explicit task transitions', () => {
    expect(canTransitionTask('queued', 'running')).toBe(true)
    expect(canTransitionTask('running', 'cancelling')).toBe(true)
    expect(canTransitionTask('cancelling', 'cancelled')).toBe(true)
    expect(canTransitionTask('completed', 'running')).toBe(false)
    expect(canTransitionTask('failed', 'completed')).toBe(false)
  })

  it('reports Windows NVIDIA compute modes without overstating other platforms', () => {
    expect(classifyComputeMode({ platform: 'win32', nvidia: true, vramGb: 8, cuda: true })).toBe(
      'recommended'
    )
    expect(classifyComputeMode({ platform: 'win32', nvidia: true, vramGb: 4, cuda: true })).toBe(
      'compatible'
    )
    expect(classifyComputeMode({ platform: 'darwin', nvidia: false, vramGb: 0, cuda: false })).toBe(
      'unsupported'
    )
  })

  it('keeps renderer-selected paths inside the managed root', () => {
    expect(resolveManagedPath('/safe/root', 'jobs/job-1/output.mp4')).toBe(
      '/safe/root/jobs/job-1/output.mp4'
    )
    expect(() => resolveManagedPath('/safe/root', '../private.txt')).toThrow('路径越界')
    expect(() => resolveManagedPath('/safe/root', '/tmp/private.txt')).toThrow('路径必须是相对路径')
  })
})
