declare global {
  interface Window {
    inference: typeof import('./index').inferencePreload
  }
}

export {}
