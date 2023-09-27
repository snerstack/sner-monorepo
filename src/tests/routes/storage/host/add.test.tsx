import HostAddPage from '@/routes/storage/host/add'
import HostListPage from '@/routes/storage/host/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host add page', () => {
  it('shows form', () => {
    renderWithProviders({ element: <HostAddPage />, path: '/storage/host/add' })
    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Hosts')).toBeTruthy()
    expect(listItems.includes('Add')).toBeTruthy()
    expect(screen.getByLabelText('Address')).toHaveValue('')
    expect(screen.getByLabelText('Hostname')).toHaveValue('')
    expect(screen.getByLabelText('Os')).toHaveValue('')
    expect(screen.getByLabelText('Comment')).toHaveValue('')
  })

  it('adds new host', async () => {
    renderWithProviders({
      element: <HostAddPage />,
      path: '/storage/host/add',
      routes: [{ element: <HostListPage />, path: '/storage/host/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        host_id: 1,
      },
    })

    const addressInput = screen.getByLabelText('Address')
    const hostnameInput = screen.getByLabelText('Hostname')
    const osInput = screen.getByLabelText('Os')
    const commentInput = screen.getByLabelText('Comment')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(addressInput, { target: { value: '127.1.2.3' } })
    fireEvent.change(hostnameInput, { target: { value: 'localhost' } })
    fireEvent.change(osInput, { target: { value: 'linux' } })
    fireEvent.change(commentInput, { target: { value: 'test comment' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Successfully added a new host.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Hosts')
    })
  })

  it('adds new host (error)', () => {
    renderWithProviders({
      element: <HostAddPage />,
      path: '/storage/host/add',
      routes: [{ element: <HostListPage />, path: '/storage/host/list' }],
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    const addressInput = screen.getByLabelText('Address')
    const hostnameInput = screen.getByLabelText('Hostname')
    const osInput = screen.getByLabelText('Os')
    const commentInput = screen.getByLabelText('Comment')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(addressInput, { target: { value: '127.1.2.3' } })
    fireEvent.change(hostnameInput, { target: { value: 'localhost' } })
    fireEvent.change(osInput, { target: { value: 'linux' } })
    fireEvent.change(commentInput, { target: { value: 'test comment' } })
    fireEvent.click(addButton)
  })
})
