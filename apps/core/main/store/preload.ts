import { ipcRenderer } from 'electron'

export const storePreload = (name: string) => {
  return {
    getAll() {
      return ipcRenderer.invoke(`${name}:getAll`)
    },
    get(id: string) {
      return ipcRenderer.invoke(`${name}:get`, id)
    },
    has(id: string) {
      return ipcRenderer.invoke(`${name}:has`, id)
    },
    set(id: string, data: any) {
      return ipcRenderer.invoke(`${name}:set`, id, data)
    },
    setAll(data: any) {
      return ipcRenderer.invoke(`${name}:setAll`, data)
    },
    remove(id: string) {
      return ipcRenderer.invoke(`${name}:remove`, id)
    },
    clear() {
      return ipcRenderer.invoke(`${name}:clear`)
    }
  }
}
