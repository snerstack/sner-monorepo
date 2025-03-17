import ServiceGroupedPage from '@/routes/storage/service/grouped'
import ServiceListPage from '@/routes/storage/service/list'
import { testFilter } from '@/tests/helpers/testFilter'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Service grouped page', () => {
  it('shows grouped services ', async () => {
    renderWithProviders({
      element: <ServiceGroupedPage />,
      path: '/storage/service/grouped'
    })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Services')).toBeTruthy()
    expect(listItems.includes('Grouped')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('null')).toBeInTheDocument()
      expect(screen.getByText('testservice banner')).toBeInTheDocument()
      expect(screen.getByText('test info')).toBeInTheDocument()
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <ServiceGroupedPage />,
      path: '/storage/service/grouped',
    })

    testFilter({ query: 'Host.address=="127.4.4.4"' })

    await waitFor(() => {
      expect(screen.getByText('null')).toBeInTheDocument()
      expect(screen.getByText('testservice banner')).toBeInTheDocument()
      expect(screen.queryByText('test info')).not.toBeInTheDocument()
    })
  })

  it('filters based on info', async () => {
    renderWithProviders({
      element: <ServiceGroupedPage />,
      path: '/storage/service/grouped',
      routes: [{ element: <ServiceListPage />, path: '/storage/service/list' }],
    })

    await waitFor(() => {
      const infoLink = screen.getByRole('link', { name: 'testservice banner' })

      fireEvent.click(infoLink)
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Services')
    })
  })

  it('changes crop', async () => {
    renderWithProviders({
      element: <ServiceGroupedPage />,
      path: '/storage/service/grouped',
    })

    await waitFor(() => {
      expect(screen.getByText('testservice banner')).toBeInTheDocument()
    })

    const cropLinks = screen.getAllByTestId('grouped-crop-link')
    fireEvent.click(cropLinks[0])

    await waitFor(() => {
      expect(screen.getByText('testservice')).toBeInTheDocument()
    })
  })
})
