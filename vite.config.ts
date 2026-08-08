import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 800,
      minify: 'esbuild',
      cssCodeSplit: true,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion/react'],
            'vendor-icons': ['lucide-react'],
            'vendor-db': ['dexie'],
            'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-breaks'],
          },
        },
      },
      esbuild: {
        drop: ['console', 'debugger'],
      },
    },
  };
});
