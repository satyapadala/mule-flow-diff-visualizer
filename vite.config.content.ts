import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, // Don't wipe the primary vite build!
    sourcemap: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        inlineDynamicImports: true, // Forces all imports into one massive, self-contained javascript file!
      },
    },
  },
});
