import { createRoutes } from './config/routes'
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@': resolve('src'),
  '@config': resolve('config'),
  '@apps': resolve('apps')
}

const electronWatchInclude = [
  'apps/**/main/**',
  'apps/**/preload/**',
  'config/**',
  'src/main/**',
  'src/preload/**'
]

const routes = createRoutes()
const generatedRouteTree = resolve('src/renderer/routeTree.gen.ts')
const allowAllHosts = true as const

export default defineConfig(() => {
  return {
    main: {
      resolve: {
        alias
      },
      build: {
        watch: {
          include: electronWatchInclude
        }
      }
    },
    preload: {
      resolve: {
        alias
      },
      build: {
        watch: {
          include: electronWatchInclude
        }
      }
    },
    renderer: {
      resolve: {
        alias
      },
      root: resolve('src/renderer'),
      server: {
        host: '0.0.0.0',
        allowedHosts: allowAllHosts,
        watch: {},
        proxy: {
          '^/(api|docs|system/upload)': {
            target: 'http://localhost:3333',
            changeOrigin: true
          }
        }
      },
      build: {
        rollupOptions: {
          input: {
            index: resolve('src/renderer/index.html')
          }
        }
      },
      envPrefix: ['VITE_'],
      plugins: [
        tailwindcss(),
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
          routesDirectory: resolve('src/renderer/routes'),
          generatedRouteTree,
          virtualRouteConfig: routes
        }),
        react()
      ]
    }
  }
})
