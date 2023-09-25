import QueueListPage from '@/routes/scheduler/queue/list'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Queue list page', () => {
  it('shows table of queues', async () => {
    renderWithProviders({ element: <QueueListPage />, path: '/scheduler/queue/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Queues')

    await waitFor(() => {
      expect(screen.getByText('sner six_dns_discover')).toBeInTheDocument()
      expect(screen.getByText('sner jarm')).toBeInTheDocument()
      expect(screen.getByText('pentest nmap fullsynscan')).toBeInTheDocument()
    })
  })
})
