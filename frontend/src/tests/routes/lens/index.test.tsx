import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import LensVulnIndexPage from '@/routes/lens'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Lens vulns index page', () => {
  it('shows icon tiles', async () => {

    renderWithProviders({
      element: <LensVulnIndexPage />,
      path: '/lens/vuln',
    })

    await waitFor(() => {
      expect(screen.getByTestId('heading')).toHaveTextContent('Lens')

      expect(screen.getByText('Hosts')).toBeInTheDocument()
      expect(screen.getByText('Services')).toBeInTheDocument()
      expect(screen.getByText('Vulnerabilities')).toBeInTheDocument()
    })
  })
})
