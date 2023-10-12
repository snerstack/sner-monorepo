import ServiceEditPage from '@/routes/storage/service/edit'
import ServiceListPage from '@/routes/storage/service/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () =>
  Promise.resolve({
    address: '127.4.4.4',
    comment: 'manual testservice comment',
    host_id: 1,
    hostname: 'testhost.testdomain.test<script>alert(1);</script>',
    id: 1,
    info: 'testservice banner',
    name: 'svcx',
    port: 12345,
    proto: 'tcp',
    state: 'open:testreason',
    tags: [],
  })

describe('Service edit page', () => {
  it('shows form', async () => {
    renderWithProviders({ element: <ServiceEditPage />, path: '/storage/service/add/1', loader: loader })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Services')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()
      expect(screen.getByText('127.4.4.4 (testhost.testdomain.test<script>alert(1);</script>)')).toBeInTheDocument()
      expect(screen.getByLabelText('Host ID')).toHaveValue(1)
      expect(screen.getByLabelText('Proto')).toHaveValue('tcp')
      expect(screen.getByLabelText('Port')).toHaveValue(12345)
      expect(screen.getByLabelText('State')).toHaveValue('open:testreason')
      expect(screen.getByLabelText('Name')).toHaveValue('svcx')
      expect(screen.getByLabelText('Info')).toHaveValue('testservice banner')
      expect(screen.getByLabelText('Comment')).toHaveValue('manual testservice comment')
    })
  })

  it('edits service', async () => {
    renderWithProviders({
      element: <ServiceEditPage />,
      path: '/storage/service/edit/1',
      loader: loader,
      routes: [{ element: <ServiceListPage />, path: '/storage/service/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Service has been successfully edited.',
      },
    })

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(nameInput, { target: { value: 'edited_name' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Service has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Services')
    })
  })

  it('edits service (error)', async () => {
    renderWithProviders({
      element: <ServiceEditPage />,
      path: '/storage/service/edit/1',
      loader: loader,
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
