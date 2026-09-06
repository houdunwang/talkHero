import { verifyLicense } from './helper'
import './ipc'

setTimeout(() => {
  void verifyLicense()
}, 2000)
