import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { act, cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest'

import { cleanupElements as datatablesCleanup } from '@/lib/DataTables'
import { LSKEY_TAG_COLORS } from '@/lib/sner/tags'

import { server } from '@/tests/mocks/server'

expect.extend(matchers)

beforeAll(() => {
  server.listen()
})

beforeEach(() => {
  localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify({ dummy: '#ffc107' }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
  server.resetHandlers()
  act(() => { datatablesCleanup() })
  cleanup()
})

afterAll(() => {
  server.close()
})
