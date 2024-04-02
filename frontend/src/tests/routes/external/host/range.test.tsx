import HostRangePage from '@/routes/external/host/range'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host range page', () => {
  it('gets hosts', async () => {
    renderWithProviders({
      element: <HostRangePage />,
      path: '/external/host/range',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: [
        {
          address: '127.3.3.3',
          hostname: 'testhost1.testdomain.test',
          os: 'Test Linux 2',
          services: [
            {
              port: 12345,
              proto: 'tcp',
              state: 'closed:testreason',
            },
          ],
        },
        {
          address: '127.5.5.5',
          hostname: 'productdummy',
          services: [
            {
              info: 'product: Apache httpd version: 2.2.21 extrainfo: (Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1',
              port: 80,
              proto: 'tcp',
              state: 'open:syn-ack',
            },
          ],
        },
      ],
    })

    await waitFor(() => {
      const rangeInput = screen.getByLabelText('Range of IP addresses')

      const getButton = screen.getByRole('button', { name: 'Get hosts' })

      fireEvent.change(rangeInput, { target: { value: '127.0.0.0/8' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText('127.3.3.3 testhost1.testdomain.test')).toBeInTheDocument()
      expect(screen.getByText('127.5.5.5 productdummy')).toBeInTheDocument()
    })
  })

  it('gets hosts (error)', async () => {
    renderWithProviders({
      element: <HostRangePage />,
      path: '/external/host/range',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const rangeInput = screen.getByLabelText('Range of IP addresses')

      const getButton = screen.getByRole('button', { name: 'Get hosts' })

      fireEvent.change(rangeInput, { target: { value: 'invalid' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Couldn't get hosts.")).toBeInTheDocument()
    })
  })
})
