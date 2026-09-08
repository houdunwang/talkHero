declare global {
  interface Window {
    voice: typeof import('./index').voicePreload
  }
}

export {}
