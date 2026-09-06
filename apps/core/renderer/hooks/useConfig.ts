import { type CoreConfigType } from '@apps/core/config/config'
import { atom, useAtom } from 'jotai'

const configAtom = atom<CoreConfigType | undefined>(undefined)

export const useConfig = () => {
  const [config, setConfig] = useAtom(configAtom)

  const loadConfig = async () => {
    const data = (await window.core.config.getAll()) as CoreConfigType
    setConfig(data)
    return data
  }
  return { config, setConfig, loadConfig }
}
