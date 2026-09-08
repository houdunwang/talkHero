declare global {
  interface Window {
    video: typeof import('./index').videoPreload
  }
}

export {}
