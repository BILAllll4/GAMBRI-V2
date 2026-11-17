import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GAMBRI_V2 runs beside the original project: its own ports (web 5177, API 8788)
  server: { port: 5177, strictPort: true, proxy: { '/api': 'http://localhost:8788' } },
  preview: { port: 4175, proxy: { '/api': 'http://localhost:8788' } },
  build: { chunkSizeWarningLimit: 1600 },
})
