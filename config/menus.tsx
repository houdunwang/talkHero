import { CloudUpload, Settings, User } from 'lucide-react'

export const setting = [
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
