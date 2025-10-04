import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // THIS IS THE FIX:
  // This one line tells Vite to use relative paths for all assets.
  // This solves the "MIME type" error on Netlify.
  base: './', 
  
  plugins: [react()],
})