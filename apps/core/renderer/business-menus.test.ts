import { describe, expect, it } from 'vitest'

import { setting } from '../../../config/menus'

describe('TalkHero system configuration menus', () => {
  it('exposes the approved four business scenes in order', () => {
    expect(setting.slice(0, 4).map(({ title, to }) => ({ title, to }))).toEqual([
      { title: '视频音色', to: '/voice/config' },
      { title: '生成视频', to: '/video/workbench' },
      { title: '发布视频', to: '/publish/workbench' },
      { title: '本地推理', to: '/inference/config' }
    ])
  })
})
