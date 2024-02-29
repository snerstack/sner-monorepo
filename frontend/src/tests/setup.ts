import { server } from './mocks/server'
import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'

expect.extend(matchers)

beforeAll(() => {
  localStorage.setItem(
    'tags',
    JSON.stringify({
      tags: {
        todo: '#ffc107',
        report: '#dc3545',
      },
      prefixes: {
        report: '#dc3545',
        i: '#6c757d',
      },
    }),
  )

  server.listen()
})
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
