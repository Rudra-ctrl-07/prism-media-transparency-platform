import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            globe: ['react-globe.gl', 'three'],
            leaflet: ['leaflet'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Ensure Web Workers bundle as ESM so @huggingface/transformers imports work
    worker: {
      format: 'es' as const,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore non-source folders in watcher to avoid Windows EBUSY lock errors
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/docs/**', '**/api/**', '**/node_modules/**']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
