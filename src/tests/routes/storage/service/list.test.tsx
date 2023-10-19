import HostViewPage from '@/routes/storage/host/view'
import ServiceListPage from '@/routes/storage/service/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Service list page', () => {
  it('shows table of services', async () => {
    renderWithProviders({ element: <ServiceListPage />, path: '/storage/service/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Services')

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('testhost.testdomain.test<script>alert(1);</script>')).toBeInTheDocument()
      expect(screen.getByText('12345')).toBeInTheDocument()

      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
      expect(screen.getByText('serverz.localhost')).toBeInTheDocument()
      expect(screen.getByText('443')).toBeInTheDocument()

      expect(screen.getByText('127.3.3.3')).toBeInTheDocument()
      expect(screen.getByText('testhost1.testdomain.test')).toBeInTheDocument()
      expect(screen.getByText('420')).toBeInTheDocument()
    })

    sessionStorage.setItem('dt_toolboxes_visible', 'true')
  })

  it('views host', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
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

  it('filters results', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
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
  })

  it('annotates service', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await waitFor(() => {
      const tagsCell = screen.getAllByTestId('service_tags_annotate')[0]
      const tagsCellEmptyComment = screen.getAllByTestId('service_tags_annotate')[1]
      const commentCell = screen.getAllByTestId('service_comment_annotate')[0]
      const commentCellEmptyComment = screen.getAllByTestId('service_comment_annotate')[1]

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(tagsCellEmptyComment)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCellEmptyComment)
      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    const tagMultipleButton = screen.getByTestId('service_set_multiple_tag')

    fireEvent.click(tagMultipleButton)

    await waitFor(() => {
      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()
    })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    const tagMultipleButton = screen.getByTestId('service_unset_multiple_tag')

    fireEvent.click(tagMultipleButton)

    await waitFor(() => {
      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })
})
