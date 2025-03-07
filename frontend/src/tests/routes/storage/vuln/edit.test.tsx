import VulnEditPage from '@/routes/storage/vuln/edit'
import VulnListPage from '@/routes/storage/vuln/list'
import VulnViewPage from '@/routes/storage/vuln/view'
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
      routes: [
        { element: <VulnListPage />, path: '/storage/vuln/list' },
        { element: <VulnViewPage />, loader: loader, path: '/storage/vuln/view/1' },
      ],
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
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
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
      routes: [
        { element: <VulnListPage />, path: '/storage/vuln/list' },
        { element: <VulnViewPage />, loader: loader, path: '/storage/vuln/view/1' },
      ],
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
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
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

  it('autocompletes host', async () => {
    const { user } = renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: [
        {
          label: '127.128.129.130 (hostname: testhost.testdomain.test)',
          value: 1,
        },
        {
          label: '127.3.3.3 (hostname: testhost2.testdomain.test)',
          value: 2,
        },
      ],
    })

    await waitFor(async () => {
      await user.click(screen.getByText('Host, Service'))
    })

    const hostInput = screen.getByLabelText('Host ID')
    await user.type(hostInput, '1')

    const suggestions = screen.getByTestId('host-autocomplete-list').children
    expect(suggestions[0]).toHaveTextContent('127.128.129.130 (hostname: testhost.testdomain.test)')

    await user.hover(suggestions[0])
    await user.hover(suggestions[1])
    await user.click(suggestions[0])
  })

  it('autocompletes host (error)', async () => {
    const { user } = renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'get')
      .mockRejectedValueOnce(errorResponse({ message: 'Server error' })) // focus
      .mockResolvedValueOnce({data: [{label: 'dummy', value: '1'}]})  // input

    await waitFor(async () => {
      const labelElement = screen.getByText('Host, Service')
      await user.click(labelElement)
    })
    
    await waitFor(async () => {
      const hostInput = screen.getByLabelText('Host ID')
      await user.type(hostInput, '1')
    })

    await waitFor(() => {
      expect(screen.getByText('Error while getting autocomplete suggestions.')).toBeInTheDocument()
      expect(screen.getByText('dummy')).toBeInTheDocument()
    })
  })

  it('autocompletes service', async () => {
    const { user } = renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: [
        {
          label: 'tcp/443 127.128.129.130 (hostname: testhost.testdomain.test id:1)',
          value: 1,
        },
        {
          label: 'tcp/80 127.127.127.127 (hostname: testhost2.testdomain.test id:2)',
          value: 7,
        },
      ],
    })

    await waitFor(async () => {
      await user.click(screen.getByText('Host, Service'))
    })

    const serviceInput = screen.getByLabelText('Service ID')
    await user.type(serviceInput, '1')

    const suggestions = screen.getByTestId('service-autocomplete-list').children
    expect(suggestions[0]).toHaveTextContent('tcp/443 127.128.129.130 (hostname: testhost.testdomain.test id:1)')

    await user.hover(suggestions[0])
    await user.hover(suggestions[1])
    await user.click(suggestions[0])
  })

  it('autocompletes host (error)', async () => {
    const { user } = renderWithProviders({
      element: <VulnEditPage />,
      path: '/storage/vuln/edit/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(errorResponse({ message: 'Server error.' }))

    await waitFor(async () => {
      await user.click(screen.getByText('Host, Service'))
    })

    const serviceInput = screen.getByLabelText('Service ID')
    await user.type(serviceInput, '1')

    await waitFor(() => {
      expect(screen.getByText('Error while getting autocomplete suggestions.')).toBeInTheDocument()
    })
  })
})
