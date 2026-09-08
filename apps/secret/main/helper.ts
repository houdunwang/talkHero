import { getMachineCode } from '@apps/core/main/device'
import { sendRequest } from '@apps/core/main/request'
import { englishName as packageName } from '../../../package.json'
import { clearLicenseSecret, getLicenseSecret, setLicenseSecret } from './store'

export type BindLicenseResult = {
  message: string
  state: boolean
  // 由 HTTP 402 映射的稳定失败分类，仅在“需要购买”时出现。
  reason?: 'purchaseRequired'
}

// 绑定授权码
export const bindLicense = async (secret: string): Promise<BindLicenseResult | undefined> => {
  if (!secret) return
  const deviceCode = getMachineCode()
  const res = await sendRequest<{ message: string }>({
    method: 'POST',
    url: '/core/licenses/bind',
    data: {
      secret,
      deviceCode,
      softName: packageName
    }
  })

  if (!res.ok) {
    if (res.status === 401) {
      // 401 Unauthorized 表示授权码错误，清除可能残留的本地授权码。
      clearLicenseSecret()
      return {
        state: false,
        message: res.data?.message ?? '请输入正确的软件授权码'
      }
    }
    if (res.status === 402) {
      // 402 Payment Required 表示授权码有效但未购买当前软件。
      return {
        state: false,
        message: res.data?.message ?? '当前授权码没有该软件的使用权限',
        reason: 'purchaseRequired'
      }
    }
    if (res.status === 0) {
      return {
        state: false,
        message: '网络连接错误，请检查网络设置'
      }
    }

    return {
      state: false,
      message: res.data?.message ?? '授权码绑定失败，请稍后重试'
    }
  }

  setLicenseSecret(secret)
  return { state: true, message: '授权码绑定成功' }
}

// 验证授权码
export const verifyLicense = async () => {
  const secret = getLicenseSecret()
  if (!secret) return
  const deviceCode = getMachineCode()
  const res = await sendRequest<{ message: string }>({
    method: 'POST',
    url: '/core/licenses/verify',
    data: {
      secret,
      deviceCode,
      softName: packageName
    }
  })
  // 401：授权码错误；402：未购买或授权已失效；403：当前设备未授权。
  // 这些状态都不应继续保留本地授权码；404 属于软件配置问题，保留授权码以免误删。
  if (!res.ok && [401, 402, 403].includes(res.status)) {
    clearLicenseSecret()
  }
}
