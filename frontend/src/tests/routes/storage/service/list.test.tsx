import HostViewPage from '@/routes/storage/host/view'
import ServiceListPage from '@/routes/storage/service/list'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testDeleteRow } from '@/tests/helpers/testDeleteRow'
import { testFilter } from '@/tests/helpers/testFilter'
import { testMultipleTags } from '@/tests/helpers/testMultipleTags'
import { testSelectAllRows } from '@/tests/helpers/testSelectAllRows'
import { testSelectNoneRows } from '@/tests/helpers/testSelectNoneRows'
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
  })

  it('shows list of services with toolboxes', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'true')

    renderWithProviders({ element: <ServiceListPage />, path: '/storage/service/list' })

    await waitFor(() => {
      expect(screen.getByTestId('service_list_table_toolbox')).not.toHaveClass('collapse')
    })
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

    testFilter({ query: 'Host.address=="127.4.4.4"' })

    await waitFor(() => {
      expect(screen.getByRole('link', {'name': '127.4.4.4'})).toBeInTheDocument()
      expect(screen.queryByText('127.3.3.3')).toBeNull()
      expect(screen.queryByText('127.128.129.130')).toBeNull()
    })
  })

  it('shows service dropdown', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await waitFor(() => {
      const port = screen.getByText('443')
      fireEvent.click(port)

      const copyHttpBtn = screen.getAllByTestId('copy-http-to-clipboard-btn')[0]
      fireEvent.click(copyHttpBtn)

      const copyTelnetBtn = screen.getAllByTestId('copy-telnet-to-clipboard-btn')[0]
      fireEvent.click(copyTelnetBtn)

      const copyCurlBtn = screen.getAllByTestId('copy-curl-to-clipboard-btn')[0]
      fireEvent.click(copyCurlBtn)
    })
  })

  it('deletes host', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await waitFor(() => {
      testDeleteRow({ buttonId: 'delete-row-btn' })
    })
  })

  it('annotates service', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await waitFor(() => {
      testAnnotate({ tagsId: 'service_tags_annotate', commentId: 'service_comment_annotate' })
    })
  })

  it('selects and unselect all services', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await waitFor(() => {
      testSelectAllRows({ buttonId: 'service_select_all' })
      testSelectNoneRows({ buttonId: 'service_unselect_all' })
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await testMultipleTags({ action: 'set', testId: 'service_set_multiple_tag' })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <ServiceListPage />,
      path: '/storage/service/list',
    })

    await testMultipleTags({ action: 'unset', testId: 'service_unset_multiple_tag' })
  })
})
