import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],

    server: {
      proxy: {
        '/api/transit': {
          target: 'https://apis.openapi.sk.com',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/transit/, '/transit'),
          headers: {
            appKey: env.TMAP_APP_KEY,
          },
        },

        '/api/tmap': {
          target: 'https://apis.openapi.sk.com',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/tmap/, '/tmap'),
            headers: {
              appKey: env.TMAP_APP_KEY,
            },
        },
      },
    },
  }
})