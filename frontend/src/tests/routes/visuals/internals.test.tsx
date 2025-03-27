import InternalsPage from '@/routes/visuals/internals'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const dedent = (str: string) =>
  str
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n").trim()

const loaderData = {
  exclusions: dedent(`
    - - regex
      - ^tcp://.*:22$
    - - network
      - 127.66.66.0/26
  `),

  heatmap_check: true,

  metrics: dedent(`
    sner_storage_hosts_total 3
    sner_storage_services_total 3
    sner_storage_vulns_total 8
    sner_storage_notes_total 7
    sner_storage_versioninfo_total 9

    sner_scheduler_queue_targets_total{name="sner.nuclei"} 0
    sner_scheduler_queue_targets_total{name="dev.dummy"} 3
    sner_scheduler_queue_targets_total{name="pentest.nmap.fullsynscan"} 0
    sner_scheduler_queue_targets_total{name="sner.testssl"} 0
    sner_scheduler_queue_targets_total{name="sner.nmap.serviceversion"} 0
    sner_scheduler_queue_targets_total{name="sner.six_enum_discover"} 0
    sner_scheduler_queue_targets_total{name="sner.jarm"} 0
    sner_scheduler_queue_targets_total{name="sner.six_dns_discover"} 0

    sner_scheduler_targets_total 3

    sner_scheduler_jobs_total{state="running"} 0
    sner_scheduler_jobs_total{state="stale"} 0
    sner_scheduler_jobs_total{state="finished"} 0
    sner_scheduler_jobs_total{state="failed"} 0

    sner_scheduler_heatmap_hashvals_total 0
    sner_scheduler_heatmap_targets_total 0
    sner_scheduler_readynets_available_total 3
  `),

  planner: dedent(`
    {}
  `),

  lastruns: dedent(`
    stagex: '2025-01-01T00:00:00.000000'
  `),
}

describe('Internals page', () => {
  it('shows exclusions', async () => {
    renderWithProviders({
      element: <InternalsPage />,
      path: '/visuals/internals',
      loader: () => Promise.resolve(loaderData),
    })

    await waitFor(() => {
      expect(screen.getByText('sner_storage_hosts_total')).toBeInTheDocument()
      expect(screen.getByText('sner_storage_services_total')).toBeInTheDocument()
      expect(screen.getByText('sner_storage_notes_total')).toBeInTheDocument()
      expect(screen.getByText('heatmap_consistent:')).toBeInTheDocument()
    })
  })
})
