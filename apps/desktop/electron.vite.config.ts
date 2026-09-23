import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: ['@luma/contracts', '@luma/domain'],
      },
      lib: {
        entry: path.join(currentDirectory, 'src/main/main.ts'),
        formats: ['cjs'],
        fileName: () => 'index',
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: {
        exclude: ['@luma/contracts'],
      },
      rollupOptions: {
        input: path.join(currentDirectory, 'src/preload/preload.ts'),
        // Electron exposes this module as a runtime builtin. Keeping it
        // external prevents the npm Electron launcher package from being
        // bundled into the preload and leaving the bridge undefined.
        external: ['electron'],
        // Use CommonJS for the sandboxed preload. Electron's sandboxed
        // preload runtime provides `require('electron')`, while a package
        // configured as ESM can otherwise resolve the npm launcher package.
        output: {
          format: 'cjs',
          entryFileNames: 'preload.cjs',
          chunkFileNames: 'chunks/[name]-[hash].cjs',
        },
      },
    },
    ssr: {
      external: ['electron'],
    },
  },
  renderer: {
    root: path.join(currentDirectory, 'src/renderer'),
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@renderer': path.join(currentDirectory, 'src/renderer'),
        '@shared': path.join(currentDirectory, 'src/shared'),
      },
    },
  },
});
