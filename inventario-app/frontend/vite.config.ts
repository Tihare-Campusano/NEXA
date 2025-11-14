/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path' // path ya no es estrictamente necesario si eliminas el alias

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy(),
  ],
  // assetsInclude: ['**/*.tflite'], // ELIMINADO
  base: './',
  // resolve: { ... }, // SECCIÓN ELIMINADA/REDUCIDA
  // optimizeDeps: { ... }, // SECCIÓN ELIMINADA
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  build: {
    minify: false
  }
})