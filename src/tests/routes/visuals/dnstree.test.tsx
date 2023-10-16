import DnsTreePage from '@/routes/visuals/dnstree'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('DNS Tree page', () => {
  it('shows graph', async () => {
    renderWithProviders({
      element: <DnsTreePage />,
      path: '/visuals/dnstree',
    })

    await waitFor(() => {
      expect(screen.getByText('DOTROOT')).toBeInTheDocument()
      expect(screen.getByText('localhost')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
    })
  })

  it('changes crop and distance', () => {
    renderWithProviders({
      element: <DnsTreePage />,
      path: '/visuals/dnstree',
    })

    const cropLinks = screen.getAllByTestId('dnstree-crop-link')

    fireEvent.click(cropLinks[0])
    fireEvent.click(cropLinks[1])
    fireEvent.click(cropLinks[2])

    const distanceLinks = screen.getAllByTestId('dnstree-distance-link')

    fireEvent.click(distanceLinks[0])
    fireEvent.click(distanceLinks[1])
  })
})
