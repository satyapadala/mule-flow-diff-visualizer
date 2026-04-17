import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'popup.html', dest: '.' },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'src/popup.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return ['background', 'popup'].includes(chunkInfo.name)
            ? '[name].js'
            : 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
