import { describe, expect, it } from 'vitest'

import { selectLatestAvailableVideo } from './generated-video'

describe('selectLatestAvailableVideo', () => {
  it('skips a newer invalid record and previews the newest verified output', () => {
    expect(
      selectLatestAvailableVideo([
        {
          taskId: 'new-but-invalid',
          displayName: '损坏结果',
          previewUrl: null,
          available: false,
          unavailableReason: '文件校验失败'
        },
        {
          taskId: 'latest-valid',
          displayName: '可用结果',
          previewUrl: 'talkhero-media://video/latest-valid/output.mp4',
          available: true,
          unavailableReason: null
        }
      ])?.taskId
    ).toBe('latest-valid')
  })
})
