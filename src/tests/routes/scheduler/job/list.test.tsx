import JobListPage from '@/routes/scheduler/job/list'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Job list page', () => {
  it('shows table of jobs', async () => {
    renderWithProviders({ element: <JobListPage />, path: '/scheduler/job/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Jobs')

    await waitFor(() => {
      expect(screen.getByText('sner nmap servicedisco')).toBeInTheDocument()
      expect(screen.getByText('nuclei test')).toBeInTheDocument()
      expect(screen.getByText('sner jarm')).toBeInTheDocument()
    })
  })
})
