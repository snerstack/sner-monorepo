import HostSinglePage from '@/routes/external/host/single'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host single page', () => {
  it('gets host', async () => {
    renderWithProviders({
      element: <HostSinglePage />,
      path: '/external/host/single',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        address: '127.5.5.5',
        created: '2024-04-02T18:11:42.108111',
        hostname: 'productdummy',
        modified: '2024-04-02T18:11:42.108114',
        rescan_time: '2024-04-02T18:11:42.108116',
        services: [
          {
            created: '2024-04-02T18:11:42.108833',
            info: 'product: Apache httpd version: 2.2.21 extrainfo: (Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1',
            modified: '2024-04-02T18:11:42.108836',
            notes: [
              {
                created: '2024-04-02T18:11:42.109400',
                data: '["cpe:/a:apache:http_server:2.2.21"]',
                modified: '2024-04-02T18:11:42.109402',
                xtype: 'cpe',
              },
              {
                created: '2024-04-02T18:11:42.115422',
                data: '{"product": "Apache httpd", "version": "2.2.21", "extrainfo": "(Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1"}',
                modified: '2024-04-02T18:11:42.115426',
                xtype: 'nmap.banner_dict',
              },
              {
                created: '2024-04-02T18:11:42.115428',
                data: '{"product": "Apache httpd", "version": "0.0", "extrainfo": "(xssdummy<script>alert(window);</script>) dummy/1.1"}',
                modified: '2024-04-02T18:11:42.115429',
                xtype: 'nmap.banner_dict',
              },
              {
                created: '2024-04-02T18:11:42.115431',
                data: '["productdummy"]',
                modified: '2024-04-02T18:11:42.115432',
                xtype: 'hostnames',
              },
            ],
            port: 80,
            proto: 'tcp',
            rescan_time: '2024-04-02T18:11:42.108838',
            state: 'open:syn-ack',
          },
        ],
      },
    })

    await waitFor(() => {
      const addressInput = screen.getByLabelText('IP address')

      const getButton = screen.getByRole('button', { name: 'Get host' })

      fireEvent.change(addressInput, { target: { value: '127.5.5.5' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText('127.5.5.5 productdummy')).toBeInTheDocument()

      const notesButton = screen.getByRole('button', { name: 'Notes' })
      fireEvent.click(notesButton)
    })
  })

  it('gets host (error)', async () => {
    renderWithProviders({
      element: <HostSinglePage />,
      path: '/external/host/single',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const addressInput = screen.getByLabelText('IP address')

      const getButton = screen.getByRole('button', { name: 'Get host' })

      fireEvent.change(addressInput, { target: { value: 'invalid' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Couldn't get host.")).toBeInTheDocument()
    })
  })
})
