/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy(),
  ],
  assetsInclude: ['**/*.tflite'],
  base: './',
  resolve: {
    alias: {
      // Reemplaza todo @tensorflow/tfjs-tflite con el mock
      '@tensorflow/tfjs-tflite': path.resolve(__dirname, 'src/mocks/tflite_web_api_client.js'),
    },
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs-tflite'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
