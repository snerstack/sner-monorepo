import ServiceGroupedPage from '@/routes/storage/service/grouped'
import ServiceListPage from '@/routes/storage/service/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Service grouped page', () => {
  it('shows grouped services ', async () => {
    renderWithProviders({ element: <ServiceGroupedPage />, path: '/storage/service/grouped' })

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

    const filterForm = screen.getByTestId('filter-form')
    const filterInput = filterForm.querySelector('input')!
    const filterButton = screen.getByTestId('filter-btn')

    fireEvent.change(filterInput, { target: { value: 'Host.address=="127.4.4.4"' } })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('null')).toBeInTheDocument()
      expect(screen.getByText('testservice banner')).toBeInTheDocument()
      expect(screen.queryByText('test info')).toBeNull()
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

  it('changes crop', () => {
    renderWithProviders({
      element: <ServiceGroupedPage />,
      path: '/storage/service/grouped',
    })

    const cropLinks = screen.getAllByTestId('grouped-crop-link')

    fireEvent.click(cropLinks[0])
    fireEvent.click(cropLinks[1])
    fireEvent.click(cropLinks[2])
    fireEvent.click(cropLinks[3])
  })
})
