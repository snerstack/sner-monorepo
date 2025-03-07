import QueueEnqueuePage from '@/routes/scheduler/queue/enqueue'
import QueueListPage from '@/routes/scheduler/queue/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Queue enqueue page', () => {
  it('shows form', () => {
    renderWithProviders({
      element: <QueueEnqueuePage />,
      path: '/scheduler/queue/enqueue/1',
    })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Queues')).toBeTruthy()
    expect(listItems.includes('Enqueue')).toBeTruthy()
    expect(screen.getByLabelText('Targets')).toHaveValue('')
  })

  it('enqueues new queue', async () => {
    renderWithProviders({
      element: <QueueEnqueuePage />,
      path: '/scheduler/queue/enqueue/1',
      routes: [{ element: <QueueListPage />, path: '/scheduler/queue/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'success',
      },
    })

    const targetsInput = screen.getByLabelText('Targets')
    const enqueueButton = screen.getByRole('button', { name: 'Enqueue' })

    fireEvent.change(targetsInput, { target: { value: '127.0.0.1\n192.168.1.10' } })
    fireEvent.click(enqueueButton)

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Queues')
    })
  })
})
