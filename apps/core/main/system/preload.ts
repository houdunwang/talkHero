import { ipcRenderer } from 'electron'

export default {
  isMac: process.platform === 'darwin',
  restart: () => {
    ipcRenderer.send('restartApp')
  }
}
