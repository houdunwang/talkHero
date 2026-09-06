import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Keep a plain Vite config so shadcn CLI can recognize the renderer app
// inside this Electron workspace.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@config': resolve(__dirname, 'config'),
      '@apps': resolve(__dirname, 'apps')
    }
  }
})
