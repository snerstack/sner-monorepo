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

  it('does not refetch when hovering the same port again', async () => {
    renderWithProviders({
      element: <PortmapPage />,
      path: '/visuals/portmap',
      loader: portmapLoader,
    })

    const spy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { port: 22, portname: 'ssh', comments: [], hosts: [], infos: [], stats: [] },
    })

    const portLink = await screen.findByRole('link', { name: '22' })

    fireEvent.mouseEnter(portLink)
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))

    fireEvent.mouseEnter(portLink)
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
  })

  it('ignores stale response when quickly switching ports', async () => {
    renderWithProviders({
      element: <PortmapPage />,
      path: '/visuals/portmap',
      loader: portmapLoader,
    })

    const spy = vi.spyOn(httpClient, 'get')

    // first hovered port 22 (slower response)
    let resolveFirst!: (value: { data: PortDetails }) => void
    const firstPromise = new Promise<{ data: PortDetails }>((resolve) => {
      resolveFirst = resolve
    })
    spy.mockReturnValueOnce(firstPromise)

    // second hovered port 443 (faster response)
    spy.mockResolvedValueOnce({
      data: { port: 443, portname: 'https', comments: [], hosts: [], infos: [], stats: [] },
    })

    const port22 = await screen.findByRole('link', { name: '22' })
    const port443 = screen.getByRole('link', { name: '443' })

    fireEvent.mouseEnter(port22)
    fireEvent.mouseEnter(port443)

    // info about port 443 should appear
    await waitFor(() => {
      expect(screen.getByText(/Port 443/)).toBeInTheDocument()
    })

    // the response about port 22 arrives later
    resolveFirst({
      data: { port: 22, portname: 'ssh', comments: [], hosts: [], infos: [], stats: [] },
    })

    // info should remain about port 443
    await waitFor(() => {
      expect(screen.getByText(/Port 443/)).toBeInTheDocument()
      expect(screen.queryByText(/Port 22/)).toBeNull()
    })
  })
})
