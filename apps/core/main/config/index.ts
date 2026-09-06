import { type CoreConfigType } from '@apps/core/config/config'
import { coreConfig } from '@apps/core/config/config'
import { CreateStore } from '../store/CreateStore'
import { storeMainIpc } from '../store/storeMainIpc'
import { initConfigStore } from './init'

// 初始化配置存储
export const configStore = new CreateStore('core')

export const appConfig = new Proxy(configStore.getAll() as CoreConfigType, {
  get(_, prop) {
    return configStore.get(prop as string)
  }
})

// 初始化配置
initConfigStore(configStore, coreConfig)

storeMainIpc('config', configStore)
