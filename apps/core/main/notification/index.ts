import { Notification } from 'electron'

/**
 * 显示系统级通知
 * @param title 通知标题
 * @param body 通知内容
 */
export const showSystemNotification = (title: string, body: string) => {
  if (!Notification.isSupported()) {
    return
  }

  new Notification({ title, body }).show()
}
