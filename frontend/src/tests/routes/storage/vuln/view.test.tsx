import VulnViewPage from '@/routes/storage/vuln/view'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () =>
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
  })

describe('Vuln view page', () => {
  it('shows vuln', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
    })
  })

  it('adds tag', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: loader,
    })

    window.location = {
      reload: vi.fn(),
    } as unknown as Location

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: '',
    })

    await waitFor(() => {
      const infoTag = screen.getAllByTestId('tag-btn')[0]

      fireEvent.click(infoTag)
    })
  })

  it('annotates vuln', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const tagsCell = screen.getByTestId('vuln_tags_annotate')
      const commentCell = screen.getByTestId('vuln_comment_annotate')

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })

  it('shows vuln (no hostname and xtype)', async () => {
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
          hostname: null,
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
          xtype: null,
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4')).toBeTruthy()
      expect(listItems.includes('aggregable vuln')).toBeTruthy()
    })
  })

  it('shows associated service', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/347',
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
      expect(screen.getAllByTestId('copy-svcTgt-to-clipboard-btn')[0]).toHaveAttribute('href', 'tcp://127.128.129.130:443')
      expect(screen.getAllByTestId('copy-svcTgt-to-clipboard-btn')[1]).toHaveAttribute('href', 'tcp://serverz.localhost:443')
    })
  })

  it('shows nuclei vuln', async () => {
    renderWithProviders({
      element: <VulnViewPage />,
      path: '/storage/vuln/view/389',
      loader: () =>
        Promise.resolve({
          address: '127.123.123.123',
          comment: null,
          created: 'Thu, 19 Oct 2023 12:57:52 GMT',
          data: '{"template": "http/exposures/configs/git-config.yaml", "template-url": "https://github.com/projectdiscovery/nuclei-templates/blob/main/http/exposures/configs/git-config.yaml", "template-id": "git-config", "template-path": "/root/nuclei-templates/http/exposures/configs/git-config.yaml", "info": {"name": "Git Configuration - Detect", "author": ["pdteam", "pikpikcu", "mah3sec_"], "tags": ["config", "git", "exposure"], "description": "Git configuration was detected via the pattern /.git/config and log file on passed URLs.", "reference": null, "severity": "medium", "metadata": {"max-request": 1}, "classification": {"cve-id": null, "cwe-id": ["cwe-200"], "cvss-metrics": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", "cvss-score": 5.3}}, "type": "http", "host": "http://127.123.123.123/DVWA/", "matched-at": "http://127.123.123.123/DVWA/.git/config", "request": "GET /DVWA/.git/config HTTP/1.1\\r\\nHost: 127.123.123.123\\r\\nUser-Agent: Mozilla/5.0 (X11; OpenBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36\\r\\nConnection: close\\r\\nAccept: */*\\r\\nAccept-Language: en\\r\\nAccept-Encoding: gzip\\r\\n\\r\\n", "response": "HTTP/1.1 200 OK\\r\\nConnection: close\\r\\nContent-Length: 262\\r\\nAccept-Ranges: bytes\\r\\nDate: Wed, 19 Jul 2023 18:07:31 GMT\\r\\nEtag: \\"106-600b17b30a594\\"\\r\\nLast-Modified: Mon, 17 Jul 2023 16:42:16 GMT\\r\\nServer: Apache/2.4.52 (Ubuntu)\\r\\n\\r\\n[core]\\n\\trepositoryformatversion = 0\\n\\tfilemode = true\\n\\tbare = false\\n\\tlogallrefupdates = true\\n[remote \\"origin\\"]\\n\\turl = https://github.com/digininja/DVWA.git\\n\\tfetch = +refs/heads/*:refs/remotes/origin/*\\n[branch \\"master\\"]\\n\\tremote = origin\\n\\tmerge = refs/heads/master\\n", "ip": "127.123.123.123", "timestamp": "2023-07-19T20:07:31.173430926+02:00", "curl-command": "curl -X \'GET\' -d \'\' -H \'Accept: */*\' -H \'Accept-Language: en\' -H \'User-Agent: Mozilla/5.0 (X11; OpenBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36\' \'http://127.123.123.123/DVWA/.git/config\'", "matcher-status": true, "matched-line": null}',
          descr:
            '## Description\n\nGit configuration was detected via the pattern /.git/config and log file on passed URLs.\n\n## Extracted results\n\nNone',
          host_id: 80,
          hostname: null,
          id: 389,
          import_time: 'Wed, 19 Jul 2023 20:07:31 GMT',
          modified: 'Thu, 19 Oct 2023 12:57:52 GMT',
          name: 'Git Configuration - Detect',
          refs: [],
          rescan_time: 'Thu, 19 Oct 2023 12:57:52 GMT',
          service_id: 80,
          service_port: 80,
          service_proto: 'tcp',
          severity: 'medium',
          tags: [],
          via_target: '127.123.123.123',
          xtype: 'nuclei.git-config',
        }),
    })

    await waitFor(() => {
      const serviceLink = screen.getByTestId('service_link')

      expect(serviceLink).toHaveTextContent('<Service 80: 127.123.123.123 tcp.80>')
      expect(screen.getByText('nuclei.git-config')).toBeInTheDocument()
    })
  })
})
