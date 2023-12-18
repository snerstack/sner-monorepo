import HostListPage from '@/routes/storage/host/list'
import HostViewPage from '@/routes/storage/host/view'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testMultipleTags } from '@/tests/helpers/testMultipleTags'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host list page', () => {
  it('shows table of hosts', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'false')

    renderWithProviders({ element: <HostListPage />, path: '/storage/host/list' })

    expect(screen.getByRole('list')).toHaveTextContent('Hosts')

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('testhost.testdomain.test<script>alert(1);</script>')).toBeInTheDocument()
      expect(screen.getByText('Test Linux 1')).toBeInTheDocument()

      expect(screen.getByText('127.3.3.3')).toBeInTheDocument()
      expect(screen.getByText('testhost1.testdomain.test')).toBeInTheDocument()
      expect(screen.getByText('Test Linux 2')).toBeInTheDocument()

      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
      expect(screen.getByText('serverz.localhost')).toBeInTheDocument()
      expect(screen.getByText('Microsoft Windows Vista')).toBeInTheDocument()
    })

    sessionStorage.setItem('dt_toolboxes_visible', 'true')
  })

  it('views host', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
      routes: [
        {
          element: <HostViewPage />,
          path: '/storage/host/view/1',
          loader: () =>
            Promise.resolve({
              address: '127.4.4.4',
              comment: '',
              created: 'Mon, 17 Jul 2023 20:01:09 GMT',
              hostname: 'testhost.testdomain.test<script>alert(1);</script>',
              id: 1,
              modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
              notesCount: 3,
              os: 'Test Linux 1',
              rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
              servicesCount: 1,
              tags: ['reviewed'],
              vulnsCount: 12,
            }),
        },
      ],
    })

    await waitFor(() => {
      const addressLink = screen.getByRole('link', { name: '127.4.4.4' })

      fireEvent.click(addressLink)
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
    })
  })

  it('deletes host', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])

      window.confirm = vi.fn(() => true)

      const deleteRowButton = screen.getByTestId('delete-row-btn')

      fireEvent.click(deleteRowButton)
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    const filterForm = screen.getByTestId('filter-form')
    const filterInput = filterForm.querySelector('input')!
    const filterButton = screen.getByTestId('filter-btn')

    fireEvent.change(filterInput, { target: { value: 'Host.address=="127.4.4.4"' } })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.queryByText('127.3.3.3')).toBeNull()
      expect(screen.queryByText('127.128.129.130')).toBeNull()
    })

    const unfilterButton = screen.getByTestId('unfilter-btn')

    fireEvent.click(unfilterButton)

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('127.3.3.3')).toBeInTheDocument()
      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
    })
  })

  it('annotates host', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await waitFor(() => {
      testAnnotate({ tagsId: 'host_tags_annotate', commentId: 'host_comment_annotate' })
    })
  })

  it('annotates host (error)', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValue(errorResponse({ code: 500, message: 'Internal Server Error' }))

    await waitFor(() => {
      const tagsCell = screen.getAllByTestId('host_tags_annotate')[0]

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      const tagsInput = screen.getByTestId('tags-field').querySelector('input')!
      const defaultTags = screen.getByTestId('default-tags')
      const commentInput = screen.getByLabelText('Comment')
      const saveButton = screen.getByRole('button', { name: 'Save' })

      fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
      fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })
      fireEvent.click(defaultTags.children[0])
      fireEvent.change(commentInput, { target: { value: 'new_comment' } })
      fireEvent.click(saveButton)

      expect(screen.getByText('Error while annotating')).toBeInTheDocument()
    })
  })

  it('selects all hosts', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await waitFor(() => {
      const selectAllButton = screen.getByTestId('host_select_all')

      fireEvent.click(selectAllButton)
    })
  })

  it('unselects all hosts', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await waitFor(() => {
      const selectAllButton = screen.getByTestId('host_unselect_all')

      fireEvent.click(selectAllButton)
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await testMultipleTags({ action: 'set', testId: 'host_set_multiple_tag' })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await testMultipleTags({ action: 'unset', testId: 'host_unset_multiple_tag' })
  })
})
