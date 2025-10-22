import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // This plugin builds everything into one .html file
    viteSingleFile(),

    // This plugin handles PWA (offline) capabilities
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CFD Calculator',
        short_name: 'CFDCalc',
        description: 'Offline-capable CFD Calculator',
        theme_color: '#1e3a8a', // A dark blue color
        background_color: '#111827', // Dark background
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})