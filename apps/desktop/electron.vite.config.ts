import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.join(currentDirectory, 'src/main/main.ts'),
        formats: ['cjs'],
        fileName: () => 'index',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: path.join(currentDirectory, 'src/preload/preload.ts'),
      },
    },
  },
  renderer: {
    root: path.join(currentDirectory, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': path.join(currentDirectory, 'src/renderer'),
        '@shared': path.join(currentDirectory, 'src/shared'),
      },
    },
  },
});
