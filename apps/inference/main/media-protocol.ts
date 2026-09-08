import { app, net, protocol } from 'electron'
import { realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

let registered = false
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

export const parseTalkHeroMediaUrl = (
  requestUrl: string
): { root: 'publish' | 'voices' | 'outputs'; segments: string[] } | null => {
  const url = new URL(requestUrl)
  if (url.hostname === 'publish') {
    const match = url.pathname.match(new RegExp(`^/(${UUID})/(cover-[123]\\.png)$`, 'iu'))
    return match ? { root: 'publish', segments: [match[1], 'covers', match[2]] } : null
  }
  if (url.hostname === 'voice') {
    const match = url.pathname.match(new RegExp(`^/(${UUID})/(reference\\.wav)$`, 'iu'))
    return match ? { root: 'voices', segments: [match[1], match[2]] } : null
  }
  if (url.hostname === 'audio') {
    const match = url.pathname.match(new RegExp(`^/(${UUID})/output\\.wav$`, 'iu'))
    return match ? { root: 'outputs', segments: ['audio', `${match[1]}.wav`] } : null
  }
  return null
}

// 只把受管预览文件流给 renderer，不暴露任意本地路径。
export const registerTalkHeroMediaProtocol = async (): Promise<void> => {
  if (registered) return
  await app.whenReady()
  protocol.handle('talkhero-media', async (request) => {
    try {
      const parsed = parseTalkHeroMediaUrl(request.url)
      if (!parsed) return new Response(null, { status: 404 })
      const root = await realpath(join(app.getPath('userData'), 'talkhero', parsed.root))
      const file = await realpath(join(root, ...parsed.segments))
      const relation = relative(root, file)
      if (isAbsolute(relation) || relation.startsWith('..') || relation === '')
        return new Response(null, { status: 403 })
      return net.fetch(pathToFileURL(file).toString())
    } catch {
      return new Response(null, { status: 404 })
    }
  })
  registered = true
}
