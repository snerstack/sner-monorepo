import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import LensOverviewPage from '@/routes/lens/overview'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Lens overview page', () => {
  it('shows overview stats and severity filter links', async () => {
    renderWithProviders({
      element: <LensOverviewPage />,
      path: '/lens/overview',
    })

    await waitFor(() => {
      expect(screen.getByTestId('heading')).toHaveTextContent('Overview')
    })

    expect(screen.getByText('Hosts')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()

    expect(screen.getByText('Allowed networks')).toBeInTheDocument()
    expect(screen.getByText('::1/128')).toBeInTheDocument()

    const badgeLink = screen.getByText('Critical').closest('a')
    expect(badgeLink).toHaveAttribute('href')
  })
})
