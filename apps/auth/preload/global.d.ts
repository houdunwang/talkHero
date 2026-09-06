declare global {
  interface Window {
    auth: typeof import('./index').preload
  }
}

export {}
