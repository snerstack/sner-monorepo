import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import LensServiceListPage from '@/routes/lens/service/list'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Lens service list page', () => {
  it('shows table of services', async () => {

    renderWithProviders({
      element: <LensServiceListPage />,
      path: '/lens/service/list',
    })

    await waitFor(() => {
      expect(screen.getByTestId('heading')).toHaveTextContent('Services')

      expect(screen.getByText('127.3.4.5')).toBeInTheDocument()
      expect(screen.getByText('dummyportname')).toBeInTheDocument()
    })
  })
})
