import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../utils/renderWithProviders'
import NotFoundPage from '@/routes/notfound'

describe('Not found', () => {
  it('renders message', () => {
    renderWithProviders({ element: <NotFoundPage />, path: '/' })
    expect(screen.getByText('Not Found (404)')).toBeInTheDocument()
  })
})
