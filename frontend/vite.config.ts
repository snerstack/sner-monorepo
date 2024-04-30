/// <reference types="vitest" />
/// <reference types="vite/client" />
import react from '@vitejs/plugin-react-swc'
import * as path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/dist/config.js'

// note: testing this is a very messy, very bloody bussiness
// npm prefers IPv6 (>=17.x), while Werkzeug only uses IPv4. Proxying works if the
// Flask SERVER_NAME matches the Host header or is set to None for the development
// server. However, this doesn't apply to the live_server fixture, which changes
// the SERVER_NAME behavior.
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    },
    server: {
      port: 18080,
      proxy: {
        "/backend": process.env.SNER_BACKEND_URL || "http://localhost:18000",
      }
    },
    preview: {
      port: 18081,
      proxy: {
        "/backend": process.env.SNER_BACKEND_URL || "http://localhost:18000"
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
      exclude: [...configDefaults.exclude, 'src/tests/mocks', 'src/tests/utils'],
      testTimeout: 15000,
      threads: false,
      retry: 0,
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
}
