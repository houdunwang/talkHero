/* eslint-disable @typescript-eslint/no-unused-vars -- Global auth domain types are consumed without imports. */

interface Soft {
  id: number
  title: string
  name: string
  logo: string
  preview: string
  description: string
  version: string
  introduction: string
  createdAt: string
  feature: string
  updatedAt: string
  docUrl: string
  monthlyPrice: string
  yearlyPrice: string
  free: boolean
  freeDays: number
  licenseCount: number
  canUse: boolean
  canDownload: boolean
  subscribeEndTime: string
  downloadUrl: string
  macArmDownload: string
  macUniversalDownload: string
  windowDownload: string
}

interface Auth {
  token: string
  user: User
}

interface User {
  id: number
  nickname: string
  sex: number
  avatar: string
  createdAt: string
  updatedAt: string
  subscribeEndTime: string
  isSubscribe: boolean
}
