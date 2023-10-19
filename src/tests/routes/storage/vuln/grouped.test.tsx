import VulnGroupedPage from '@/routes/storage/vuln/grouped'
import VulnListPage from '@/routes/storage/vuln/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Vuln grouped page', () => {
  it('shows grouped vulns ', async () => {
    renderWithProviders({ element: <VulnGroupedPage />, path: '/storage/vuln/grouped' })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Vulns')).toBeTruthy()
    expect(listItems.includes('Grouped')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('aggregable vuln')).toBeInTheDocument()
      expect(screen.getByText('PHP 5.6.x < 5.6.32 Multiple Vulnerabilities')).toBeInTheDocument()
      expect(screen.getByText('test vulnerability')).toBeInTheDocument()
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <VulnGroupedPage />,
      path: '/storage/vuln/grouped',
    })

    const filterForm = screen.getByTestId('filter-form')
    const filterInput = filterForm.querySelector('input')!
    const filterButton = screen.getByTestId('filter-btn')

    fireEvent.change(filterInput, { target: { value: 'Vuln.name=="aggregable vuln"' } })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('aggregable vuln')).toBeInTheDocument()
      expect(screen.queryByText('PHP 5.6.x < 5.6.32 Multiple Vulnerabilities')).toBeNull()
      expect(screen.queryByText('test vulnerability')).toBeNull()
    })
  })

  it('filters based on name', async () => {
    renderWithProviders({
      element: <VulnGroupedPage />,
      path: '/storage/vuln/grouped',
      routes: [{ element: <VulnListPage />, path: '/storage/vuln/list' }],
    })

    await waitFor(() => {
      const nameLink = screen.getByRole('link', { name: 'aggregable vuln' })

      fireEvent.click(nameLink)
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Vulns')
    })
  })
})
