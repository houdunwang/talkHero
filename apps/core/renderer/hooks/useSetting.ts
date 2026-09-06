import { useWindow } from './useWindow'

export const useSetting = () => {
  const { windowShow } = useWindow()
  const openSettingWindow = () => {
    windowShow('setting')
  }
  return { openSettingWindow }
}
