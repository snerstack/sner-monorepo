import { server } from './mocks/server'
import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'
import { vi } from 'vitest'

vi.stubEnv('VITE_SERVER_URL', 'http://localhost:18000')

expect.extend(matchers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
