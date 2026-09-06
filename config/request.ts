import { app } from 'electron'

const isDev = !app.isPackaged

const defaultBaseUrl = isDev ? 'http://localhost:3333/api' : 'https://www.houdunyun.com/api'

export default {
  baseUrl: process.env.API_BASE_URL || defaultBaseUrl
}
