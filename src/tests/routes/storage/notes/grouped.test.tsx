import NoteGroupedPage from '@/routes/storage/note/grouped'
import NoteListPage from '@/routes/storage/note/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Note grouped page', () => {
  it('shows grouped notes ', async () => {
    renderWithProviders({ element: <NoteGroupedPage />, path: '/storage/note/grouped' })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Notes')).toBeTruthy()
    expect(listItems.includes('Grouped')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('cpe')).toBeInTheDocument()
      expect(screen.getByText('nmap.banner_dict')).toBeInTheDocument()
      expect(screen.getByText('hostnames')).toBeInTheDocument()
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <NoteGroupedPage />,
      path: '/storage/note/grouped',
    })

    const filterForm = screen.getByTestId('filter-form')
    const filterInput = filterForm.querySelector('input')!
    const filterButton = screen.getByTestId('filter-btn')

    fireEvent.change(filterInput, { target: { value: 'Note.xtype=="cpe"' } })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('cpe')).toBeInTheDocument()
      expect(screen.queryByText('nmap.banner_dict')).toBeNull()
      expect(screen.queryByText('hostnames')).toBeNull()
    })
  })

  it('filters based on xtype', async () => {
    renderWithProviders({
      element: <NoteGroupedPage />,
      path: '/storage/note/grouped',
      routes: [{ element: <NoteListPage />, path: '/storage/note/list' }],
    })

    await waitFor(() => {
      const nameLink = screen.getByRole('link', { name: 'cpe' })

      fireEvent.click(nameLink)
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Notes')
    })
  })
})
