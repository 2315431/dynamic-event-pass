import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  // THIS IS THE FINAL FIX:
  // This one line tells Vite to use a relative path ('./') instead of an
  // absolute path ('/'). This is the key to solving the MIME type error on Netlify.
  base: './', 
  
  plugins: [
    react(),
    nodePolyfills({
      global: true,
      process: true,
    })
  ],
})