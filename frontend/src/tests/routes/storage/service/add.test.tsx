import HostViewPage from '@/routes/storage/host/view'
import ServiceAddPage from '@/routes/storage/service/add'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () =>
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
  })

describe('Service add page', () => {
  it('shows form', async () => {
    renderWithProviders({ element: <ServiceAddPage />, path: '/storage/service/add/1', loader: loader })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Services')).toBeTruthy()
      expect(listItems.includes('Add')).toBeTruthy()
      expect(screen.getByText('127.4.4.4 (testhost.testdomain.test<script>alert(1);</script>)')).toBeInTheDocument()
      expect(screen.getByLabelText('Host ID')).toHaveValue(1)
      expect(screen.getByLabelText('Proto')).toHaveValue('')
      expect(screen.getByLabelText('Port')).toHaveValue(0)
      expect(screen.getByLabelText('State')).toHaveValue('')
      expect(screen.getByLabelText('Name')).toHaveValue('')
      expect(screen.getByLabelText('Info')).toHaveValue('')
      expect(screen.getByLabelText('Comment')).toHaveValue('')
    })
  })

  it('adds new service', async () => {
    renderWithProviders({
      element: <ServiceAddPage />,
      path: '/storage/service/add/1',
      loader: loader,
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
      const hostIdInput = screen.getByLabelText('Host ID')
      const protoInput = screen.getByLabelText('Proto')
      const portInput = screen.getByLabelText('Port')
      const stateInput = screen.getByLabelText('State')
      const nameInput = screen.getByLabelText('Name')
      const infoInput = screen.getByLabelText('Info')
      const commentInput = screen.getByLabelText('Comment')
      const addButton = screen.getByRole('button', { name: 'Add' })

      fireEvent.change(hostIdInput, { target: { value: 1 } })
      fireEvent.change(protoInput, { target: { value: 'tcp' } })
      fireEvent.change(portInput, { target: { value: '80' } })
      fireEvent.change(stateInput, { target: { value: 'open:test' } })
      fireEvent.change(nameInput, { target: { value: 'test name' } })
      fireEvent.change(infoInput, { target: { value: 'test info' } })
      fireEvent.change(commentInput, { target: { value: 'test comment' } })
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Successfully added a new service.')).toBeInTheDocument()
    })
  })

  it('adds new service (error)', async () => {
    renderWithProviders({
      element: <ServiceAddPage />,
      path: '/storage/service/add/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'error message' }))

    await waitFor(() => {
      const protoInput = screen.getByLabelText('Proto')
      const portInput = screen.getByLabelText('Port')
      const addButton = screen.getByRole('button', { name: 'Add' })
      fireEvent.change(protoInput, { target: { value: 'tcp' } })
      fireEvent.change(portInput, { target: { value: '80' } })
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByText('error message')).toBeInTheDocument()
    })
  })
})
