/// <reference types="vitest" />
/// <reference types="vite/client" />
import react from '@vitejs/plugin-react-swc'
import * as path from 'path'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/dist/config.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: [...configDefaults.exclude, 'src/tests/mocks', 'src/tests/utils'],
    testTimeout: 15000,
    threads: false,
    retry: 3,
    reporters: ['hanging-process', 'verbose'],
    coverage: {
      provider: 'v8',
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      exclude: ['src/tests/mocks', 'src/tests/utils'],
    },
  },
})
