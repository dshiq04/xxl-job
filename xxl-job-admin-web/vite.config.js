import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The build output is served by Spring Boot from /static/new-ui/.
// base './' keeps the assets relative so the context path (/xxl-job-admin) works.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../xxl-job-admin/src/main/resources/static/new-ui',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000
  },
  server: {
    port: 5173,
    proxy: {
      '/xxl-job-admin': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
})
