import { CloudUpload, Cpu, Film, MicVocal, Send, Settings, User } from 'lucide-react'

export const setting = [
  {
    title: '视频音色',
    to: '/voice/config',
    icon: MicVocal
  },
  {
    title: '生成视频',
    to: '/video/workbench',
    icon: Film
  },
  {
    title: '发布视频',
    to: '/publish/workbench',
    icon: Send
  },
  {
    title: '本地推理',
    to: '/inference/config',
    icon: Cpu
  },
  {
    title: '帐号订阅',
    to: '/auth/subscribe',
    icon: User
  },
  {
    title: '更新软件',
    to: '/core/update',
    icon: CloudUpload
  },
  {
    title: '系统配置',
    to: '/core/config',
    icon: Settings
  }
]
