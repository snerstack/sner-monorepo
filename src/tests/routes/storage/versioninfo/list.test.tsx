import HostViewPage from '@/routes/storage/host/view'
import VersionInfosListPage from '@/routes/storage/versioninfo/list'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testMultipleTags } from '@/tests/helpers/testMultipleTags'
import { testSelectAllRows } from '@/tests/helpers/testSelectAllRows'
import { testSelectNoneRows } from '@/tests/helpers/testSelectNoneRows'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Versioninfo list page', () => {
  it('shows table of versioninfos', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'false')
    sessionStorage.setItem('dt_viatarget_column_visible', 'false')

    renderWithProviders({ element: <VersionInfosListPage />, path: '/storage/versioninfo/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Versioninfo (pre-computed)')

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('testhost.testdomain.test<script>alert(1);</script>')).toBeInTheDocument()
      expect(screen.getByText('12345/tcp')).toBeInTheDocument()
      expect(screen.getByText('microsoft windows_nt')).toBeInTheDocument()
      expect(screen.getByText('3.5.1')).toBeInTheDocument()
    })

    sessionStorage.setItem('dt_toolboxes_visible', 'true')
    sessionStorage.setItem('dt_viatarget_column_visible', 'true')
  })

  it('views host', async () => {
    renderWithProviders({
      element: <VersionInfosListPage />,
      path: '/storage/versioninfo/list',
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
      const addressLink = screen.getAllByRole('link', { name: '127.5.5.5' })[0]

      fireEvent.click(addressLink)
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.5.5.5 productdummy')).toBeTruthy()
    })
  })

  it('queries by product and version', async () => {
    renderWithProviders({ element: <VersionInfosListPage />, path: '/storage/versioninfo/list' })

    const productInput = screen.getByLabelText('Product')
    const versionInput = screen.getByLabelText('Versionspec')
    const submitButton = screen.getByRole('button', { name: 'Query' })
    fireEvent.change(productInput, { target: { value: 'apache' } })
    fireEvent.change(versionInput, { target: { value: '<=2.0' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('127.5.5.5')).toBeInTheDocument()
      expect(screen.getByText('apache http_server')).toBeInTheDocument()
      expect(screen.getByText('2.2.21')).toBeInTheDocument()
      expect(screen.queryByText('127.4.4.4')).toBeNull()
    })
  })

  it('annotates versioninfo', async () => {
    renderWithProviders({
      element: <VersionInfosListPage />,
      path: '/storage/versioninfo/list',
    })

    await waitFor(() => {
      testAnnotate({ tagsId: 'versioninfo_tags_annotate', commentId: 'versioninfo_comment_annotate' })
    })
  })

  it('selects and unselects all versioninfos', async () => {
    renderWithProviders({
      element: <VersionInfosListPage />,
      path: '/storage/versioninfo/list',
    })

    await waitFor(() => {
      testSelectAllRows({ buttonId: 'versioninfo_select_all' })
      testSelectNoneRows({ buttonId: 'versioninfo_unselect_all' })
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <VersionInfosListPage />,
      path: '/storage/versioninfo/list',
    })

    await testMultipleTags({ action: 'set', testId: 'versioninfo_set_multiple_tag' })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <VersionInfosListPage />,
      path: '/storage/versioninfo/list',
    })

    await testMultipleTags({ action: 'unset', testId: 'versioninfo_unset_multiple_tag' })
  })
})
