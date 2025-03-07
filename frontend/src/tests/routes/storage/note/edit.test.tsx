import NoteEditPage from '@/routes/storage/note/edit'
import NoteListPage from '@/routes/storage/note/list'
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
    data: '["cpe:/o:microsoft:windows_nt:3.5.1"]',
    host_id: 1,
    hostname: 'testhost.testdomain.test<script>alert(1);</script>',
    id: 1,
    import_time: null,
    modified: 'Thu, 31 Aug 2023 17:50:08 GMT',
    service_id: 1,
    service_port: 12345,
    service_proto: 'tcp',
    tags: ['report', 'falsepositive', 'info'],
    via_target: null,
    xtype: 'deb',
  })

describe('Note edit page', () => {
  it('shows form', async () => {
    renderWithProviders({
      element: <NoteEditPage />,
      path: '/storage/note/edit/1',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Notes')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()
      expect(screen.getByLabelText('Host ID')).toHaveValue(1)
      expect(screen.getByLabelText('Service ID')).toHaveValue(1)
      expect(screen.getByLabelText('Via target')).toHaveValue('')
      expect(screen.getByLabelText('xType')).toHaveValue('deb')
      expect(screen.getByLabelText('Data')).toHaveValue('["cpe:/o:microsoft:windows_nt:3.5.1"]')
      expect(screen.getByLabelText('Comment')).toHaveValue('')
    })
  })

  it('edits note', async () => {
    renderWithProviders({
      element: <NoteEditPage />,
      path: '/storage/note/edit/1',
      loader: loader,
      routes: [{ element: <NoteListPage />, path: '/storage/note/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Note has been successfully edited.',
      },
    })

    await waitFor(() => {
      const dataInput = screen.getByLabelText('Data')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(dataInput, { target: { value: 'edited_data' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Note has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Notes')
    })
  })

  it('edits note (no optional values)', async () => {
    renderWithProviders({
      element: <NoteEditPage />,
      path: '/storage/note/edit/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: null,
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          data: '["cpe:/o:microsoft:windows_nt:3.5.1"]',
          host_id: 1,
          hostname: null,
          id: 1,
          import_time: null,
          modified: 'Thu, 31 Aug 2023 17:50:08 GMT',
          service_id: null,
          service_port: null,
          service_proto: null,
          tags: ['report', 'falsepositive', 'info'],
          via_target: null,
          xtype: 'deb',
        }),
      routes: [{ element: <NoteListPage />, path: '/storage/note/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Note has been successfully edited.',
      },
    })

    await waitFor(() => {
      const dataInput = screen.getByLabelText('Data')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(dataInput, { target: { value: 'edited_data' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Note has been successfully edited.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Notes')
    })
  })

  it('edits note (error)', async () => {
    renderWithProviders({
      element: <NoteEditPage />,
      path: '/storage/note/edit/1',
      loader: loader,
      routes: [{ element: <NoteListPage />, path: '/storage/note/list' }],
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'error message' }))

    await waitFor(() => {
      const dataInput = screen.getByLabelText('Data')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(dataInput, { target: { value: 'edited_data' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('error message')).toBeInTheDocument()
    })
  })
})
