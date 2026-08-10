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
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
              if (
                id.includes('node_modules/motion/') ||
                id.includes('node_modules/framer-motion/')
              ) {
                return 'vendor-motion';
              }
              if (id.includes('node_modules/lucide-react/')) {
                return 'vendor-icons';
              }
              if (id.includes('node_modules/dexie/')) {
                return 'vendor-db';
              }
              if (
                id.includes('node_modules/react-markdown/') ||
                id.includes('node_modules/remark-') ||
                id.includes('node_modules/hast') ||
                id.includes('node_modules/mdast') ||
                id.includes('node_modules/micromark') ||
                id.includes('node_modules/unist')
              ) {
                return 'vendor-markdown';
              }
            }
          },
        },
      },
      esbuild: {
        drop: ['console', 'debugger'],
      },
    },
  };
});
