import InternalsPage from '@/routes/visuals/internals'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Internals page', () => {
  it('shows exclusions', async () => {
    renderWithProviders({
      element: <InternalsPage />,
      path: '/visuals/internals',
      loader: () =>
        Promise.resolve({
          exclusions: '- - regex\n  - ^tcp://.*:22$\n- - network\n  - 127.66.66.0/26\n',
          planner: '{}\n',
        }),
    })

    await waitFor(() => {
      expect(screen.getByText('- - regex - ^tcp://.*:22$ - - network - 127.66.66.0/26')).toBeInTheDocument()
    })
  })
})
