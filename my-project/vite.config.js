import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for large dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Firebase chunk
          firebase: ['firebase/app', 'firebase/auth'],
          // UI libraries chunk
          ui: ['@heroicons/react', 'lucide-react', 'react-hot-toast', 'react-toastify'],
          // Redux chunk
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Utils chunk
          utils: ['axios', 'react-helmet-async']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (can be disabled in production)
    sourcemap: false,
    // Minify for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'firebase/app',
      'firebase/auth',
      'axios'
    ]
  }
})