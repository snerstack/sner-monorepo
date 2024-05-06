import HostViewPage from '@/routes/storage/host/view'
import VulnSearchListPage from '@/routes/storage/vulnsearch/list'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testFilter } from '@/tests/helpers/testFilter'
import { testMultipleTags } from '@/tests/helpers/testMultipleTags'
import { testSelectAllRows } from '@/tests/helpers/testSelectAllRows'
import { testSelectNoneRows } from '@/tests/helpers/testSelectNoneRows'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Vulnsearch list page', () => {
  it('shows table of vulnsearches', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'false')
    sessionStorage.setItem('dt_viatarget_column_visible', 'false')

    renderWithProviders({ element: <VulnSearchListPage />, path: '/storage/vulnsearch/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Vulnsearch')

    await waitFor(() => {
      expect(screen.getByText('127.5.5.5')).toBeInTheDocument()
    })

    sessionStorage.setItem('dt_toolboxes_visible', 'true')
    sessionStorage.setItem('dt_viatarget_column_visible', 'true')
  })

  it('views host', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
      routes: [
        {
          element: <HostViewPage />,
          path: '/storage/host/view/3',
          loader: () =>
            Promise.resolve({
              address: '127.5.5.5',
              comment: null,
              created: 'Thu, 14 Dec 2023 16:07:15 GMT',
              hostname: 'productdummy',
              id: 3,
              modified: 'Thu, 14 Dec 2023 16:07:15 GMT',
              notesCount: 4,
              os: null,
              rescan_time: 'Thu, 14 Dec 2023 16:07:15 GMT',
              servicesCount: 1,
              tags: [],
              vulnsCount: 0,
            }),
        },
      ],
    })

    await waitFor(() => {
      const addressLink = screen.getByRole('link', { name: '127.5.5.5' })

      fireEvent.click(addressLink)
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.5.5.5 productdummy')).toBeTruthy()
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
    })

    testFilter({ query: 'Host.address=="127.5.5.5"' })

    await waitFor(() => {
      expect(screen.getByRole('link', {'name': '127.5.5.5'})).toBeInTheDocument()
    })
  })

  it('annotates vulnsearch', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
    })

    await waitFor(() => {
      testAnnotate({ tagsId: 'vulnsearch_tags_annotate', commentId: 'vulnsearch_comment_annotate' })
    })
  })

  it('selects and unselects all vulnsearch', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
    })

    await waitFor(() => {
      testSelectAllRows({ buttonId: 'vulnsearch_select_all' })
      testSelectNoneRows({ buttonId: 'vulnsearch_unselect_all' })
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
    })

    await testMultipleTags({ action: 'set', testId: 'vulnsearch_set_multiple_tag' })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <VulnSearchListPage />,
      path: '/storage/vulnsearch/list',
    })

    await testMultipleTags({ action: 'unset', testId: 'vulnsearch_unset_multiple_tag' })
  })
})
