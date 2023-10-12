import VulnViewPage from '@/routes/storage/vuln/view'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Vuln view page', () => {
  it('shows vuln', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: null,
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          data: 'agg vuln data',
          descr: 'aggregable vuln description',
          host_id: 1,
          hostname: 'testhost.testdomain.test<script>alert(1);</script>',
          id: 1,
          import_time: null,
          modified: 'Tue, 29 Aug 2023 14:08:10 GMT',
          name: 'aggregable vuln',
          refs: [],
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          service_id: null,
          service_port: null,
          service_proto: null,
          severity: 'high',
          tags: ['reportdata'],
          via_target: null,
          xtype: 'x.agg',
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
    })
  })

  it('shows vuln', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: null,
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          data: 'agg vuln data',
          descr: 'aggregable vuln description',
          host_id: 1,
          hostname: 'testhost.testdomain.test<script>alert(1);</script>',
          id: 1,
          import_time: null,
          modified: 'Tue, 29 Aug 2023 14:08:10 GMT',
          name: 'aggregable vuln',
          refs: [],
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          service_id: null,
          service_port: null,
          service_proto: null,
          severity: 'high',
          tags: ['reportdata'],
          via_target: null,
          xtype: 'x.agg',
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
    })
  })

  it('shows associated service', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: () =>
        Promise.resolve({
          address: '127.128.129.130',
          comment: null,
          created: 'Thu, 03 Aug 2023 13:14:01 GMT',
          data: '',
          descr:
            '## Synopsis\n\nThe version of PHP running on the remote web server is affected by multiple vulnerabilities.\n\n## Description\n\nAccording to its banner, the version of PHP running on the remote web server is 5.6.x prior to 5.6.32. It is, therefore, affected by multiple vulnerabilities.\n\n## Solution\n\nUpgrade to PHP version 5.6.32 or later.',
          host_id: 37,
          hostname: 'serverz.localhost',
          id: 347,
          import_time: 'Mon, 11 Mar 2019 14:23:16 GMT',
          modified: 'Thu, 24 Aug 2023 20:57:47 GMT',
          name: 'PHP 5.6.x < 5.6.32 Multiple Vulnerabilities',
          refs: [
            'CVE-2016-1283',
            'CVE-1900-0000',
            'CVE-2017-16642',
            'BID-79825',
            'BID-101745',
            'CERT-836068',
            'URL-http://www.php.net/ChangeLog-5.php#5.6.32',
            'MSF-Testcase metasploit module name',
            'NSS-104631',
          ],
          rescan_time: 'Thu, 03 Aug 2023 13:14:01 GMT',
          service_id: 52,
          service_port: 443,
          service_proto: 'tcp',
          severity: 'critical',
          tags: [],
          via_target: '127.128.129.130',
          xtype: 'nessus.104631',
        }),
    })

    await waitFor(() => {
      const serviceLink = screen.getByTestId('service_link')

      expect(serviceLink).toHaveTextContent('<Service 52: 127.128.129.130 tcp.443>')
      expect(screen.getByText('tcp://127.128.129.130:443')).toBeInTheDocument()
      expect(screen.getByText('tcp://serverz.localhost:443')).toBeInTheDocument()
    })
  })
})
