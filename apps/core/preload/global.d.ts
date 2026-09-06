declare global {
  interface Window {
    core: typeof import('./index').preload
  }
}

export {}
