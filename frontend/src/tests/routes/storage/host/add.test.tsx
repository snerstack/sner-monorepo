import HostAddPage from '@/routes/storage/host/add'
import HostViewPage from '@/routes/storage/host/view'
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
      routes: [
        {
          element: <HostViewPage />,
          path: '/storage/host/view/1',
          loader: () =>
            Promise.resolve({
              address: '127.4.4.4',
              comment: '',
              created: 'Mon, 17 Jul 2023 20:01:09 GMT',
              hostname: 'testhost.testdomain.test<script>alert(1);</script>',
              id: 1,
              modified: 'Wed, 27 Sep 2023 18:23:19 GMT',
              notesCount: 3,
              os: 'Test Linux 1',
              rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
              servicesCount: 4,
              tags: ['reviewed'],
              vulnsCount: 12,
            }),
        },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        host_id: 1,
      },
    })

    await waitFor(() => {
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

    await waitFor(() => {
      expect(screen.getByText('Successfully added a new host.')).toBeInTheDocument()
    })
  })

  it('adds new host (error)', () => {
    renderWithProviders({
      element: <HostAddPage />,
      path: '/storage/host/add',
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
