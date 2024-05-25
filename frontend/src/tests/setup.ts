import { server } from './mocks/server'
import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest'

import { LSKEY_TAG_COLORS } from '@/lib/sner/tags'

expect.extend(matchers)

beforeAll(() => {
  server.listen()
})

beforeEach(() => {
  localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify({ dummy: '#ffc107' }))
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  server.resetHandlers()
  cleanup()
})

afterAll(() => {
  server.close()
})
