import type { GeneratedVideoSummary } from '@apps/publish/types/public'

// Select the newest usable output while preserving unavailable history entries for the publish page.
export const selectLatestAvailableVideo = (
  videos: GeneratedVideoSummary[]
): GeneratedVideoSummary | null =>
  videos.find((video) => video.available && video.previewUrl) ?? null
