declare global {
  interface Window {
    secret: typeof import('./index').preload
  }
}

export {}
