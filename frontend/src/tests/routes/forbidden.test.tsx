import ForbiddenPage from '@/routes/forbidden'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../utils/renderWithProviders'

describe('Forbidden page', () => {
  it('shows page', () => {
    renderWithProviders({ element: <ForbiddenPage />, path: '/' })
    expect(screen.getByText('Not Authorized (403)')).toBeInTheDocument()
  })
})
