import { app } from 'electron'
import ElectronStore from 'electron-store'
import { join } from 'path'

export type StoreValue = any
const Store = ((ElectronStore as any).default ?? ElectronStore) as typeof ElectronStore

const getStoreDir = () => join(app.getPath('userData'), 'store')

export class CreateStore {
  private configStore: ElectronStore<Record<string, StoreValue>>

  constructor(name: string, defaults: Record<string, StoreValue> = {}) {
    this.configStore = new Store<Record<string, StoreValue>>({
      name,
      cwd: getStoreDir(),
      defaults
    })
  }

  getAll() {
    return this.configStore.store
  }

  get(id: string, defaultValue?: StoreValue) {
    const val = this.configStore.get(id, defaultValue)
    return val ?? defaultValue ?? null
  }

  has(id: string) {
    return this.configStore.has(id)
  }

  set(nameOrData: string | Record<string, StoreValue>, data?: StoreValue) {
    if (typeof nameOrData === 'object' && nameOrData !== null) {
      this.configStore.set(nameOrData)
      return nameOrData
    }

    const name = (nameOrData as string).trim()
    if (data === undefined) {
      this.configStore.delete(name)
    } else {
      this.configStore.set(name, data)
    }
    return data
  }

  setAll(data: Record<string, StoreValue>) {
    this.configStore.set({
      ...this.configStore.store,
      ...data
    })
  }

  /** 用一份已校验的完整对象替换 store，避免旧版本或损坏字段残留。 */
  replaceAll(data: Record<string, StoreValue>): void {
    this.configStore.store = data
  }

  remove(id: string) {
    if (!this.configStore.has(id)) {
      return false
    }

    this.configStore.delete(id)
    return true
  }

  clear() {
    this.configStore.clear()
  }

  /**
   * 监听配置项的变化
   * @param key 配置项名称
   * @param callback 变化时的回调函数，接收新值和旧值
   * @returns 返回一个取消监听的函数
   */
  onDidChange(key: string, callback: (newValue?: StoreValue, oldValue?: StoreValue) => void): any {
    return this.configStore.onDidChange(key, callback)
  }
}
