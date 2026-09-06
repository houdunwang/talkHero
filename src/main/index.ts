import { mainModuleLoaders } from '@config/main'
import { setupUserDataPath } from '@apps/core/main/config/userData'

setupUserDataPath()

const loadMainModules = async () => {
  for (const load of mainModuleLoaders) {
    await load()
  }
}

void loadMainModules()
