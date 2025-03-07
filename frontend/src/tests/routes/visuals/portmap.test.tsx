import PortmapPage from '@/routes/visuals/portmap'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const portmapLoader = () =>
  Promise.resolve({
    portmap: [
      {
        count: 1,
        port: 22,
        size: 10,
      },
      {
        count: 1,
        port: 443,
        size: 10,
      },
      {
        count: 1,
        port: 12345,
        size: 10,
      },
    ],
    portstates: [
      {
        count: 1,
        state: null,
      },
      {
        count: 1,
        state: 'open',
      },
      {
        count: 1,
        state: 'open:nessus',
      },
    ],
  })

describe('Portmap page', () => {
  it('shows ports', async () => {
    renderWithProviders({
      element: <PortmapPage />,
      path: '/visuals/portmap',
      loader: portmapLoader,
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '22' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '443' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '12345' })).toBeInTheDocument()
    })
  })

  it('shows portstat', async () => {
    renderWithProviders({
      element: <PortmapPage />,
      path: '/visuals/portmap',
      loader: portmapLoader,
    })

    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        comments: [],
        hosts: [
          {
            host_address: '127.128.129.130',
            host_hostname: 'serverz.localhost',
            host_id: 37,
          },
        ],
        infos: [],
        port: '443',
        portname: 'https',
        stats: [
          {
            count: 1,
            proto: 'tcp',
          },
        ],
      },
    })

    await waitFor(() => {
      const portLink = screen.getByRole('link', { name: '443' })

      fireEvent.mouseEnter(portLink)
    })

    await waitFor(() => {
      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
      expect(screen.getByText('serverz.localhost')).toBeInTheDocument()
    })
  })

  it('shows portstat (no hostname and portname)', async () => {
    renderWithProviders({
      element: <PortmapPage />,
      path: '/visuals/portmap',
      loader: portmapLoader,
    })

    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        comments: [],
        hosts: [
          {
            host_address: '127.128.129.130',
            host_hostname: null,
            host_id: 37,
          },
        ],
        infos: [],
        port: '443',
        portname: null,
        stats: [
          {
            count: 1,
            proto: 'tcp',
          },
        ],
      },
    })

    await waitFor(() => {
      const portLink = screen.getByRole('link', { name: '443' })

      fireEvent.mouseEnter(portLink)
    })

    await waitFor(() => {
      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
      expect(screen.queryByText('serverz.localhost')).toBeNull()
    })
  })
})
