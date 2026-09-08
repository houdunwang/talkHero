declare global {
  interface Window {
    publish: typeof import('./index').publishPreload
  }
}

export {}
