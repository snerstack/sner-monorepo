import VisualsPage from '@/routes/visuals'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Visuals page', () => {
  it('shows heading', () => {
    renderWithProviders({ element: <VisualsPage />, path: '/visuals' })

    expect(screen.getByRole('list')).toHaveTextContent('Visuals')
  })
})
