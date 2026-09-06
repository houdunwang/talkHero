import { HdProvider } from '@apps/core/renderer/boot/HdProvider'
import { createRoot } from 'react-dom/client'

const rootElement = document.getElementById('root')!

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(<HdProvider />)
}
