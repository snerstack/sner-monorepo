import RootPage from '@/routes/root'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../utils/renderWithProviders'

describe('Home page', () => {
  it('shows title', () => {
    renderWithProviders({ element: <RootPage />, path: '/' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Slow Network Recon Service')
  })
})
