import VulnSearchViewPage from '@/routes/storage/vulnsearch/view'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () =>
  Promise.resolve({
    vsearch: {
      id: '13c23e9861e2a42ad6ce66aee0927f80',
      host_id: 3,
      service_id: 3,
      host_address: '127.5.5.5',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 80,
      via_target: null,
      cveid: 'CVE-1900-0000',
      name: 'dummy cve',
      description: 'dummy cve description',
      cvss: 1.3,
      cvss3: 2.4,
      attack_vector: 'NETWORK',
      cpe: {
        full: 'cpe:/a:apache:http_server:2.4.38',
      },
      cpe_full: null,
      tags: [],
      comment: null,
    },
    cve_data: {
      dummmy: 'data',
    },
  })

describe('Vulnsearch view page', () => {
  it('shows vulnsearch', async () => {
    renderWithProviders({
      element: <VulnSearchViewPage />,
      path: '/storage/vulnsearch/view/13c23e9861e2a42ad6ce66aee0927f80',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vulnsearch')).toBeTruthy()
      expect(listItems.includes('13c23e9861e2a42ad6ce66aee0927f80')).toBeTruthy()
    })
  })
})
