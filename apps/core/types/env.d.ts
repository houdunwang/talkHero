/// <reference types="vite/client" />

declare module '*.png?asset' {
  const assetPath: string
  export default assetPath
}

declare module '*.jpg?asset' {
  const assetPath: string
  export default assetPath
}

declare module '*.jpeg?asset' {
  const assetPath: string
  export default assetPath
}
