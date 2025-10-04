import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', 
  plugins: [
    react(),
    // This plugin provides the 'Buffer' translator for the browser.
    nodePolyfills({
      // To exclude specific polyfills, add them to this list.
      exclude: [],
      // Whether to polyfill `global`.
      global: true,
      // Whether to polyfill `process`.
      process: true,
    })
  ],
})