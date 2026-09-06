import { SECRET_IPC } from '@apps/secret/config/defaults'
import { ipcMain } from 'electron'
import { bindLicense } from './helper'

ipcMain.removeHandler(SECRET_IPC.bindLicense)
ipcMain.handle(SECRET_IPC.bindLicense, (_event, secret: string) => bindLicense(secret))
