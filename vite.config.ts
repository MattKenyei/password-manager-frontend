import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const isExtension = mode === 'extension'

  return {
    plugins: [
      vue(),
      ...(isExtension ? [crx({ manifest })] : []),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      outDir: isExtension ? 'dist-extension' : 'dist',
      emptyOutDir: true,
    },
    server: isExtension
      ? {
        port: 5174,
        strictPort: true,
        hmr: { port: 5174 },
      }
      : {
        port: 5173,
        strictPort: true,
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
          '/ws': { target: 'ws://localhost:8080', ws: true },
        },
      },

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.ts'],
      exclude: ['node_modules', 'dist', 'dist-extension', 'e2e'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/crypto/**', 'src/utils/**'],
        exclude: ['**/*.test.ts', '**/*.worker.ts'],
      },
    },
  }
})