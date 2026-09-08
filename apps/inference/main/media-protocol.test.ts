import { describe, expect, it } from 'vitest'
import { parseTalkHeroMediaUrl } from './media-protocol'

describe('TalkHero media URL', () => {
  it('allows only opaque managed cover, audio and generated-video preview paths', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    expect(parseTalkHeroMediaUrl(`talkhero-media://publish/${id}/cover-2.png`)).toEqual({
      root: 'publish',
      segments: [id, 'covers', 'cover-2.png']
    })
    expect(parseTalkHeroMediaUrl(`talkhero-media://voice/${id}/reference.wav`)).toEqual({
      root: 'voices',
      segments: [id, 'reference.wav']
    })
    expect(parseTalkHeroMediaUrl(`talkhero-media://audio/${id}/output.wav`)).toEqual({
      root: 'outputs',
      segments: ['audio', `${id}.wav`]
    })
    expect(parseTalkHeroMediaUrl(`talkhero-media://video/${id}/output.mp4`)).toEqual({
      root: 'outputs',
      segments: ['video', `${id}.mp4`]
    })
    expect(parseTalkHeroMediaUrl(`talkhero-media://voice/${id}/../features.bin`)).toBeNull()
    expect(parseTalkHeroMediaUrl(`talkhero-media://publish/${id}/cover-4.png`)).toBeNull()
    expect(parseTalkHeroMediaUrl('talkhero-media://evil/anything')).toBeNull()
  })
})
