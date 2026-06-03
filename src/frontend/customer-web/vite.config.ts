import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Book a Ride',
        short_name: 'Ride',
        theme_color: '#1a1f36',
        background_color: '#f0f2f8',
        display: 'standalone',
        icons: [{ src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
    }),
  ],
  server: { port: 5174 },
})
