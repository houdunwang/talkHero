import { SettingLayout } from '@apps/core/renderer/components/layouts/SettingLayout'
import { createFileRoute } from '@tanstack/react-router'

import { VoiceProfileConfigContent } from './studio'

export const Route = createFileRoute('/voice/config')({ component: VoiceProfileConfig })

function VoiceProfileConfig() {
  return (
    <SettingLayout>
      <VoiceProfileConfigContent />
    </SettingLayout>
  )
}
