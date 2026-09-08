import { mainModuleLoaders } from '@config/main'
import { setupUserDataPath } from '@apps/core/main/config/userData'
import { protocol } from 'electron'

protocol.registerSchemesAsPrivileged([
  { scheme: 'talkhero-media', privileges: { secure: true, supportFetchAPI: true, stream: true } }
])

setupUserDataPath()

const loadMainModules = async () => {
  for (const load of mainModuleLoaders) {
    await load()
  }
}

void loadMainModules()
