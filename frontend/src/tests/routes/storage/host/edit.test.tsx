import HostEditPage from '@/routes/storage/host/edit'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host edit page', () => {
  it('shows form', async () => {
    renderWithProviders({
      element: <HostEditPage />,
      path: '/storage/host/edit/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: '',
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          hostname: 'testhost.testdomain.test<script>alert(1);</script>',
          id: 1,
          modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
          notesCount: 3,
          os: 'Test Linux 1',
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          servicesCount: 1,
          tags: ['reviewed'],
          vulnsCount: 12,
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Hosts')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()
      expect(screen.getByLabelText('Address')).toHaveValue('127.4.4.4')
      expect(screen.getByLabelText('Hostname')).toHaveValue('testhost.testdomain.test<script>alert(1);</script>')
      expect(screen.getByLabelText('Os')).toHaveValue('Test Linux 1')
      expect(screen.getByLabelText('Comment')).toHaveValue('')
    })
  })

  it('edits host', async () => {
    renderWithProviders({
      element: <HostEditPage />,
      path: '/storage/host/edit/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: '',
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          hostname: '',
          id: 1,
          modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
          notesCount: 3,
          os: '',
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          servicesCount: 1,
          tags: [],
          vulnsCount: 12,
        }),
    })

    await waitFor(() => {
      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
        data: {
          message: 'Host has been successfully edited.',
        },
      })

      const addressInput = screen.getByLabelText('Address')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(addressInput, { target: { value: '127.1.2.3' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Host has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Hosts')
    })
  })

  it('edits host (with optional values)', async () => {
    renderWithProviders({
      element: <HostEditPage />,
      path: '/storage/host/edit/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: 'test comment',
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          hostname: 'testhost.testdomain.test<script>alert(1);</script>',
          id: 1,
          modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
          notesCount: 3,
          os: 'Test Linux 1',
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          servicesCount: 1,
          tags: ['reviewed'],
          vulnsCount: 12,
        }),
    })

    await waitFor(() => {
      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
        data: {
          message: 'Host has been successfully edited.',
        },
      })

      const addressInput = screen.getByLabelText('Address')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(addressInput, { target: { value: '127.1.2.3' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Host has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Hosts')
    })
  })

  it('edits host (error)', async () => {
    renderWithProviders({
      element: <HostEditPage />,
      path: '/storage/host/edit/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: '',
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          hostname: 'testhost.testdomain.test<script>alert(1);</script>',
          id: 1,
          modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
          notesCount: 3,
          os: 'Test Linux 1',
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          servicesCount: 1,
          tags: ['reviewed'],
          vulnsCount: 12,
        }),
    })

    await waitFor(() => {
      vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

      const addressInput = screen.getByLabelText('Address')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(addressInput, { target: { value: 'invalid' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Error while editing a host.')).toBeInTheDocument()
    })
  })
})
