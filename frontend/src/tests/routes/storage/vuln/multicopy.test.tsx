import VulnListPage from '@/routes/storage/vuln/list'
import VulnMulticopyPage from '@/routes/storage/vuln/multicopy'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
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

describe('Vuln multicopy page', () => {
  it('shows table of vulns', async () => {
    renderWithProviders({ element: <VulnMulticopyPage />, path: '/storage/vuln/multicopy/1', loader: loader })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vulns')).toBeTruthy()
      expect(listItems.includes('Multicopy')).toBeTruthy()

      expect(screen.getAllByText('127.4.4.4')[0]).toBeInTheDocument()
      expect(screen.getAllByText('testhost.testdomain.test<script>alert(1);</script>')[0]).toBeInTheDocument()

      expect(screen.getAllByText('127.128.129.130')[0]).toBeInTheDocument()
      expect(screen.getAllByText('serverz.localhost')[0]).toBeInTheDocument()
    })
  })

  it('shows form', async () => {
    renderWithProviders({ element: <VulnMulticopyPage />, path: '/storage/vuln/multicopy/1', loader: loader })

    await waitFor(() => {
      expect(screen.getByLabelText('Endpoints')).toHaveValue('')
      expect(screen.getByLabelText('Name')).toHaveValue('aggregable vuln')
      expect(screen.getByLabelText('xType')).toHaveValue('x.agg')
      expect(screen.getByLabelText('Descr')).toHaveValue('aggregable vuln description')
      expect(screen.getByLabelText('Data')).toHaveValue('agg vuln data')
      expect(screen.getByLabelText('Refs')).toHaveValue('')
      expect(screen.getByLabelText('Comment')).toHaveValue('')
    })
  })

  it('multicopies', async () => {
    renderWithProviders({
      element: <VulnMulticopyPage />,
      path: '/storage/vuln/multicopy/1',
      loader: loader,
      routes: [
        {
          path: '/storage/vuln/list',
          element: <VulnListPage />,
        },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { new_vulns: '[1, 50]' } })

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])

      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)
    })
  })

  it('multicopies (no optional values)', async () => {
    renderWithProviders({
      element: <VulnMulticopyPage />,
      path: '/storage/vuln/multicopy/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: null,
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          data: null,
          descr: null,
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
          tags: [],
          via_target: null,
          xtype: null,
        }),
      routes: [
        {
          path: '/storage/vuln/list',
          element: <VulnListPage />,
        },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { new_vulns: '[1, 50]' } })

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])

      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)
    })
  })

  it('multicopies (error)', async () => {
    renderWithProviders({
      element: <VulnMulticopyPage />,
      path: '/storage/vuln/multicopy/1',
      loader: loader,
      routes: [
        {
          path: '/storage/vuln/list',
          element: <VulnListPage />,
        },
      ],
    })

    vi.spyOn(httpClient, 'post').mockRejectedValue(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])

      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Error while multicopying vulns.')).toBeInTheDocument()
    })
  })
})
