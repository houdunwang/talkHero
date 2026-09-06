import { ipcMain } from 'electron'
import { CreateStore } from './CreateStore'

export const storeMainIpc = (channel: string, store: CreateStore) => {
  ipcMain.removeHandler(`${channel}:getAll`)
  ipcMain.handle(`${channel}:getAll`, () => {
    return store.getAll()
  })

  ipcMain.removeHandler(`${channel}:get`)
  ipcMain.handle(`${channel}:get`, (_, id: string) => {
    return store.get(id)
  })

  ipcMain.removeHandler(`${channel}:has`)
  ipcMain.handle(`${channel}:has`, (_, id: string) => {
    return store.has(id)
  })

  ipcMain.removeHandler(`${channel}:set`)
  ipcMain.handle(`${channel}:set`, (_, id: string, data: any) => {
    return store.set(id, data)
  })

  ipcMain.removeHandler(`${channel}:setAll`)
  ipcMain.handle(`${channel}:setAll`, (_, data: any) => {
    return store.setAll(data)
  })

  ipcMain.removeHandler(`${channel}:remove`)
  ipcMain.handle(`${channel}:remove`, (_, id: string) => {
    return store.remove(id)
  })

  ipcMain.removeHandler(`${channel}:clear`)
  ipcMain.handle(`${channel}:clear`, () => {
    store.clear()
  })
}
