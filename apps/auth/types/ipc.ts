export const AUTH_IPC = {
  snapshot: 'auth:snapshot',
  snapshotChanged: 'auth:snapshot-changed',
  logout: 'auth:logout',
  loginCreate: 'auth:login:create',
  loginCheck: 'auth:login:check',
  loginCancel: 'auth:login:cancel',
  purchaseOptions: 'auth:purchase:options',
  paymentState: 'auth:payment:state',
  paymentCreate: 'auth:payment:create',
  paymentCheck: 'auth:payment:check',
  paymentSync: 'auth:payment:sync',
  paymentCancel: 'auth:payment:cancel'
} as const
