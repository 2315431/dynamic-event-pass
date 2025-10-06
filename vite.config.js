import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', 
  plugins: [
    react(),
    nodePolyfills({ global: true, process: true }),
    // This plugin builds the service worker for offline support.
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // This tells the service worker to cache all the necessary files.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})