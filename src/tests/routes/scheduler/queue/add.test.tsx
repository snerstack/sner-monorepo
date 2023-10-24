import QueueAddPage from '@/routes/scheduler/queue/add'
import QueueListPage from '@/routes/scheduler/queue/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Queue add page', () => {
  it('shows form', () => {
    renderWithProviders({
      element: <QueueAddPage />,
      path: '/scheduler/queue/add',
    })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Queues')).toBeTruthy()
    expect(listItems.includes('Add')).toBeTruthy()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Config')).toHaveValue('')
    expect(screen.getByLabelText('Group size')).toHaveValue(1)
    expect(screen.getByLabelText('Priority')).toHaveValue(0)
  })

  it('adds new queue', async () => {
    renderWithProviders({
      element: <QueueAddPage />,
      path: '/scheduler/queue/add',
      routes: [{ element: <QueueListPage />, path: '/scheduler/queue/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Queue has been successfully added.',
      },
    })

    const nameInput = screen.getByLabelText('Name')
    const configInput = screen.getByLabelText('Config')
    const groupSizeInput = screen.getByLabelText('Group size')
    const priorityInput = screen.getByLabelText('Priority')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(nameInput, { target: { value: 'test_queue' } })
    fireEvent.change(configInput, { target: { value: 'module: nmap\nargs: -sS --top-ports 10000' } })
    fireEvent.change(groupSizeInput, { target: { value: 10 } })
    fireEvent.change(priorityInput, { target: { value: 3 } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Queue has been successfully added.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Queues')
    })
  })

  it('adds new queue (error)', async () => {
    renderWithProviders({
      element: <QueueAddPage />,
      path: '/scheduler/queue/add',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      errorResponse({
        code: 400,
        errors: {
          name: ['This field is required.'],
        },
      }),
    )

    const nameInput = screen.getByLabelText('Name')
    const configInput = screen.getByLabelText('Config')
    const groupSizeInput = screen.getByLabelText('Group size')
    const priorityInput = screen.getByLabelText('Priority')
    const activeInput = screen.getByLabelText('Active')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.change(configInput, { target: { value: 'module: nmap\nargs: -sS --top-ports 10000' } })
    fireEvent.change(groupSizeInput, { target: { value: 10 } })
    fireEvent.change(priorityInput, { target: { value: 3 } })
    fireEvent.click(activeInput)
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('This field is required.')).toBeInTheDocument()
    })
  })

  it('adds new queue (errors)', async () => {
    renderWithProviders({
      element: <QueueAddPage />,
      path: '/scheduler/queue/add',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      errorResponse({
        code: 400,
        errors: {
          config: ["Invalid YAML: 'NoneType' object has no attribute 'read'"],
          group_size: ['Number must be at least 1.'],
        },
      }),
    )

    const nameInput = screen.getByLabelText('Name')
    const configInput = screen.getByLabelText('Config')
    const groupSizeInput = screen.getByLabelText('Group size')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(nameInput, { target: { value: 'test_queue' } })
    fireEvent.change(configInput, { target: { value: '' } })
    fireEvent.change(groupSizeInput, { target: { value: -1 } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Invalid YAML: 'NoneType' object has no attribute 'read'")).toBeInTheDocument()
      expect(screen.getByText('Number must be at least 1.')).toBeInTheDocument()
    })
  })
})
