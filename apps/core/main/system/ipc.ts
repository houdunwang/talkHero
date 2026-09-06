import { ipcMain } from 'electron'
import { restartApp } from './functions'

ipcMain.on('restartApp', () => {
  restartApp()
})
