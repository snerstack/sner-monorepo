import ProductsPage from '@/routes/external/versioninfo/products'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Versioninfo products page', () => {
  it('gets products', async () => {
    renderWithProviders({
      element: <ProductsPage />,
      path: '/external/versioninfo/products',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: [
        {
          extra: {},
          host_address: '127.5.5.5',
          host_hostname: 'productdummy',
          product: 'apache http_server',
          service_port: 80,
          service_proto: 'tcp',
          version: '2.2.21',
        },
      ],
    })

    await waitFor(() => {
      const filterInput = screen.getByLabelText('Filter')
      const productInput = screen.getByLabelText('Product')
      const versionSpecInput = screen.getByLabelText('Version spec')

      const getButton = screen.getByRole('button', { name: 'Get products' })

      fireEvent.change(filterInput, { target: { value: 'Versioninfo.host_address=="127.5.5.5"' } })
      fireEvent.change(productInput, { target: { value: 'apache' } })
      fireEvent.change(versionSpecInput, { target: { value: '>=2' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText('apache http_server 2.2.21')).toBeInTheDocument()
    })
  })

  it('gets products (error)', async () => {
    renderWithProviders({
      element: <ProductsPage />,
      path: '/external/versioninfo/products',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const filterInput = screen.getByLabelText('Filter')
      const productInput = screen.getByLabelText('Product')
      const versionSpecInput = screen.getByLabelText('Version spec')

      const getButton = screen.getByRole('button', { name: 'Get products' })

      fireEvent.change(filterInput, { target: { value: 'invalid' } })
      fireEvent.change(productInput, { target: { value: 'invalid' } })
      fireEvent.change(versionSpecInput, { target: { value: 'invalid' } })

      fireEvent.click(getButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Couldn't get products.")).toBeInTheDocument()
    })
  })
})
