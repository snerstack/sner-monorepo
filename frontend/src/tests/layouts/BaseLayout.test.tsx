import BaseLayout from '@/layouts/BaseLayout'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Base layout', () => {
  it('provides simple navbar page layout', () => {
    renderWithProviders({ element: <BaseLayout />, path: '/' })
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
