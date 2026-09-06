import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@': resolve('src'),
      '@config': resolve('config'),
      '@apps': resolve('apps')
    }
  },
  test: {
    environment: 'node',
    include: ['apps/**/*.test.ts']
  }
})
