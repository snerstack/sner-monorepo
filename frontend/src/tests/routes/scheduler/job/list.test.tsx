import JobListPage from '@/routes/scheduler/job/list'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Job list page', () => {
  it('shows table of jobs', async () => {
    renderWithProviders({ element: <JobListPage />, path: '/scheduler/job/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Jobs')

    await waitFor(() => {
      expect(screen.getByText('sner.nmap.servicedisco')).toBeInTheDocument()
      expect(screen.getByText('nuclei.test')).toBeInTheDocument()
      expect(screen.getByText('sner.jarm')).toBeInTheDocument()
    })
  })

  it('repeats job', async () => {
    renderWithProviders({ element: <JobListPage />, path: '/scheduler/job/list' })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Job has been successfully repeated.',
      },
    })

    await waitFor(() => {
      const repeatButton = screen.getAllByTestId('repeat-btn')[0]
      repeatButton.click()
    })

    await waitFor(() => {
      expect(screen.getByText('Job has been successfully repeated.')).toBeInTheDocument()
    })
  })

  it('reconciles job', async () => {
    renderWithProviders({ element: <JobListPage />, path: '/scheduler/job/list' })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Job has been successfully reconciled.',
      },
    })

    await waitFor(() => {
      const reconcileButton = screen.getAllByTestId('reconcile-btn')[0]
      reconcileButton.click()
    })

    await waitFor(() => {
      expect(screen.getByText('Job has been successfully reconciled.')).toBeInTheDocument()
    })
  })
})
