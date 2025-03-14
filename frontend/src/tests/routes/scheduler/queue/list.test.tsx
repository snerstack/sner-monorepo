import QueueEnqueuePage from '@/routes/scheduler/queue/enqueue'
import QueueListPage from '@/routes/scheduler/queue/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Queue list page', () => {
  it('shows table of queues', async () => {
    renderWithProviders({ element: <QueueListPage />, path: '/scheduler/queue/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Queues')

    await waitFor(() => {
      expect(screen.getByText('sner.six_dns_discover')).toBeInTheDocument()
      expect(screen.getByText('sner.jarm')).toBeInTheDocument()
      expect(screen.getByText('pentest.nmap.fullsynscan')).toBeInTheDocument()
    })
  })

  it('redirects to enqueue page', async () => {
    renderWithProviders({
      element: <QueueListPage />,
      path: '/scheduler/queue/list',
      routes: [{ element: <QueueEnqueuePage />, path: '/scheduler/queue/enqueue/1' }],
    })

    await waitFor(() => {
      const enqueueButton = screen.getAllByTestId('btn')[0]

      fireEvent.click(enqueueButton)
    })
  })

  it('flushes queue', async () => {
    renderWithProviders({ element: <QueueListPage />, path: '/scheduler/queue/list' })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { message: 'Queue has been successfully flushed.' } })

    await waitFor(() => {
      const flushButton = screen.getAllByTestId('queue-flush')[0]

      fireEvent.click(flushButton)
    })
  })

  it('prunes queue', async () => {
    renderWithProviders({ element: <QueueListPage />, path: '/scheduler/queue/list' })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { message: 'Queue has been successfully pruned.' } })

    await waitFor(() => {
      const pruneButton = screen.getAllByTestId('queue-prune')[0]

      fireEvent.click(pruneButton)
    })
  })
})
