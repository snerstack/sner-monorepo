import QueueEditPage from '@/routes/scheduler/queue/edit'
import QueueListPage from '@/routes/scheduler/queue/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Queue edit page', () => {
  it('shows form', async () => {
    renderWithProviders({
      element: <QueueEditPage />,
      path: '/scheduler/queue/edit/1',
      loader: () =>
        Promise.resolve({
          active: true,
          config: 'module: nmap\nargs: -sS --top-ports 10000 -Pn --scanflags ECESYN',
          group_size: 2,
          id: 1,
          name: 'sner.nmap.servicedisco',
          priority: 10,
          reqs: [],
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Queues')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()
      expect(screen.getByLabelText('Name')).toHaveValue('sner.nmap.servicedisco')
      expect(screen.getByLabelText('Config')).toHaveValue(
        'module: nmap\nargs: -sS --top-ports 10000 -Pn --scanflags ECESYN',
      )
      expect(screen.getByLabelText('Group size')).toHaveValue(2)
      expect(screen.getByLabelText('Priority')).toHaveValue(10)
    })
  })

  it('edits new queue', async () => {
    renderWithProviders({
      element: <QueueEditPage />,
      path: '/scheduler/queue/edit/1',
      loader: () =>
        Promise.resolve({
          active: true,
          config: 'module: nmap\nargs: -sS --top-ports 10000 -Pn --scanflags ECESYN',
          group_size: 2,
          id: 1,
          name: 'sner.nmap.servicedisco',
          priority: 10,
          reqs: [],
        }),
      routes: [{ element: <QueueListPage />, path: '/scheduler/queue/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Queue has been successfully edited.',
      },
    })

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'edited_queue' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Queue has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Queues')
    })
  })

  it('edits new queue (errors)', async () => {
    renderWithProviders({
      element: <QueueEditPage />,
      path: '/scheduler/queue/edit/1',
      loader: () =>
        Promise.resolve({
          active: true,
          config: 'module: nmap\nargs: -sS --top-ports 10000 -Pn --scanflags ECESYN',
          group_size: 2,
          id: 1,
          name: 'sner.nmap.servicedisco',
          priority: 10,
          reqs: [],
        }),
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      errorResponse({
        code: 400,
        message: "Invalid form",
        errors: {
          config: ["Invalid YAML: 'NoneType' object has no attribute 'read'"],
          group_size: ['Number must be at least 1.'],
        },
      }),
    )

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const configInput = screen.getByLabelText('Config')
      const groupSizeInput = screen.getByLabelText('Group size')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'test_queue' } })
      fireEvent.change(configInput, { target: { value: '' } })
      fireEvent.change(groupSizeInput, { target: { value: -1 } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Invalid form")).toBeInTheDocument()
      expect(screen.getByText(/Invalid YAML: 'NoneType' object has no attribute 'read'/)).toBeInTheDocument()
      expect(screen.getByText(/Number must be at least 1./)).toBeInTheDocument()
    })
  })
})
