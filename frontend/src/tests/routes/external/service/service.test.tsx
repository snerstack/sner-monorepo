import ServiceFilterPage from '@/routes/external/service'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Service filter page', () => {
  it('gets services', async () => {
    renderWithProviders({
      element: <ServiceFilterPage />,
      path: '/external/service',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: [
        {
          address: '127.5.5.5',
          hostname: 'productdummy',
          info: 'product: Apache httpd version: 2.2.21 extrainfo: (Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1',
          port: 80,
          proto: 'tcp',
          state: 'open:syn-ack',
        },
      ],
    })

    await waitFor(() => {
      const filterInput = screen.getByLabelText('Filter')

      const getButton = screen.getByRole('button', { name: 'Get services' })

      fireEvent.change(filterInput, { target: { value: 'Service.port==80' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText('tcp://127.5.5.5:80')).toBeInTheDocument()
    })
  })

  it('gets services (error)', async () => {
    renderWithProviders({
      element: <ServiceFilterPage />,
      path: '/external/service',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const filterInput = screen.getByLabelText('Filter')

      const getButton = screen.getByRole('button', { name: 'Get services' })

      fireEvent.change(filterInput, { target: { value: 'invalid' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Couldn't get services.")).toBeInTheDocument()
    })
  })
})
