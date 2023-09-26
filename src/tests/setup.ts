import { server } from './mocks/server'
import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'
import { vi } from 'vitest'

vi.stubEnv('VITE_SERVER_URL', 'http://localhost:18000')
vi.stubEnv('VITE_HOST_TAGS', 'reviewed, todo')
vi.stubEnv('VITE_SERVICE_TAGS', 'reviewed, todo')
vi.stubEnv('VITE_VULN_TAGS', 'info, report, report:data, todo, falsepositive')
vi.stubEnv('VITE_NOTE_TAGS', 'reviewed, todo')
vi.stubEnv('VITE_ANNOTATE_TAGS', 'sslhell')

expect.extend(matchers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
