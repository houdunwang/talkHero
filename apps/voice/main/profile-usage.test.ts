import { describe, expect, it } from 'vitest'
import { ProfileUsageCounter } from './profile-usage'

describe('ProfileUsageCounter', () => {
  it('keeps a profile active until every concurrent user releases it', () => {
    const usage = new ProfileUsageCounter()
    const releaseFirst = usage.acquire('profile')
    const releaseSecond = usage.acquire('profile')
    expect(usage.activeIds()).toEqual(new Set(['profile']))
    releaseFirst()
    expect(usage.activeIds()).toEqual(new Set(['profile']))
    releaseSecond()
    expect(usage.activeIds()).toEqual(new Set())
    expect(() => releaseSecond()).toThrow('音色引用已释放')
  })
})
