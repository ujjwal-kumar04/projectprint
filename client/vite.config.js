import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,          // disable sourcemaps in production
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split large third-party libs into separate cached chunks
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          pdf:     ['jspdf', 'html2canvas'],
          socket:  ['socket.io-client'],
        },
      },
    },
  },
  optimizeDeps: {
    // background-removal uses WASM — exclude from pre-bundling
    exclude: ['@imgly/background-removal']
  }
});
