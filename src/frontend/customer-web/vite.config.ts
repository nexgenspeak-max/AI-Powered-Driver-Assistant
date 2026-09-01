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
      workbox: {
        // avatar-3d model/textures are ~35MB — fetch on demand, don't precache on install
        globIgnores: ['**/assets/avatar-3d/**'],
      },
      manifest: {
        name: 'Book a Ride',
        short_name: 'Ride',
        theme_color: '#8B5CF6',
        background_color: '#f4f6fb',
        display: 'standalone',
        icons: [{ src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
    }),
  ],
  server: { port: 5174 },
})
