import VulnEditPage from '@/routes/storage/vuln/edit'
import VulnListPage from '@/routes/storage/vuln/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

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

describe('Vuln edit page', () => {
  it('shows form', async () => {
    renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vulns')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()
      expect(screen.getByLabelText('Host ID')).toHaveValue(1)
      expect(screen.getByLabelText('Service ID')).toHaveValue(0)
      expect(screen.getByLabelText('Via target')).toHaveValue('')
      expect(screen.getByLabelText('Name')).toHaveValue('aggregable vuln')
      expect(screen.getByLabelText('xType')).toHaveValue('x.agg')
      expect(screen.getByLabelText('Descr')).toHaveValue('aggregable vuln description')
      expect(screen.getByLabelText('Data')).toHaveValue('agg vuln data')
      expect(screen.getByLabelText('Refs')).toHaveValue('')
      expect(screen.getByLabelText('Comment')).toHaveValue('')
    })
  })

  it('edits vuln', async () => {
    renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
      routes: [{ element: <VulnListPage />, path: '/storage/vuln/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Vuln has been successfully edited.',
      },
    })

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'edited_name' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Vuln has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Vulns')
    })
  })

  it('edits vuln (no optional values)', async () => {
    renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
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
          service_id: 1,
          service_port: 80,
          service_proto: 'tcp',
          severity: 'high',
          tags: [],
          via_target: null,
          xtype: null,
        }),
      routes: [{ element: <VulnListPage />, path: '/storage/vuln/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Vuln has been successfully edited.',
      },
    })

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'edited_name' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Vuln has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Vulns')
    })
  })

  it('edits vuln (error)', async () => {
    renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
      routes: [{ element: <VulnListPage />, path: '/storage/vuln/list' }],
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'edited_name' } })
      fireEvent.click(editButton)
    })
  })
})
