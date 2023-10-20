import HostViewPage from '@/routes/storage/host/view'
import VulnListPage from '@/routes/storage/vuln/list'
import VulnMulticopyPage from '@/routes/storage/vuln/multicopy'
import VulnViewPage from '@/routes/storage/vuln/view'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Vuln list page', () => {
  it('shows table of vulns', async () => {
    renderWithProviders({ element: <VulnListPage />, path: '/storage/vuln/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Vulns')

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('testhost.testdomain.test<script>alert(1);</script>')).toBeInTheDocument()
      expect(screen.getByText('aggregable vuln')).toBeInTheDocument()

      expect(screen.getByText('127.128.129.130')).toBeInTheDocument()
      expect(screen.getByText('serverz.localhost')).toBeInTheDocument()
      expect(screen.getByText('PHP 5.6.x < 5.6.32 Multiple Vulnerabilities')).toBeInTheDocument()

      expect(screen.getByText('127.3.3.3')).toBeInTheDocument()
      expect(screen.getByText('testhost1.testdomain.test')).toBeInTheDocument()
      expect(screen.getByText('another test vulnerability')).toBeInTheDocument()
    })

    sessionStorage.setItem('dt_viatarget_column_visible', 'true')
  })

  it('views host', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
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

  it('views vuln', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
      routes: [
        {
          element: <VulnViewPage />,
          path: '/storage/vuln/view/1',
          loader: () =>
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
            }),
        },
      ],
    })

    await waitFor(() => {
      const vulnLink = screen.getByRole('link', { name: 'aggregable vuln' })

      fireEvent.click(vulnLink)
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
    })
  })

  it('filters results', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    const filterForm = screen.getByTestId('filter-form')
    const filterInput = filterForm.querySelector('input')!
    const filterButton = screen.getByTestId('filter-btn')

    fireEvent.change(filterInput, { target: { value: 'Vuln.name=="aggregable vuln"' } })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getByText('aggregable vuln')).toBeInTheDocument()
      expect(screen.queryByText('PHP 5.6.x < 5.6.32 Multiple Vulnerabilities')).toBeNull()
      expect(screen.queryByText('test vulnerability')).toBeNull()
    })
  })

  it('redirects to multicopy page', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
      routes: [
        {
          element: <VulnMulticopyPage />,
          path: '/storage/vuln/multicopy/1',
          loader: () =>
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
            }),
        },
      ],
    })

    await waitFor(() => {
      const multicopyButton = screen.getAllByTestId('multicopy-btn')[0]

      fireEvent.click(multicopyButton)
    })
  })

  it('annotates vuln', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    await waitFor(() => {
      const tagsCell = screen.getAllByTestId('vuln_tags_annotate')[0]
      const commentCell = screen.getAllByTestId('vuln_comment_annotate')[0]

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      vi.spyOn(httpClient, 'post').mockResolvedValue('')

      const tagsField = screen.getByTestId('tags-field')
      const tagsInput = tagsField.querySelector('input')!
      const defaultTags = screen.getByTestId('default-tags')
      const commentInput = screen.getByLabelText('Comment')
      const saveButton = screen.getByRole('button', { name: 'Save' })

      fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
      fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })
      fireEvent.click(defaultTags.children[0])
      fireEvent.change(commentInput, { target: { value: 'new_comment' } })
      fireEvent.click(saveButton)

      fireEvent.doubleClick(commentCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })

  it('deletes vuln', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
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

  it('deletes vuln (error)', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    await waitFor(() => {
      window.confirm = vi.fn(() => true)

      const deleteRowButton = screen.getByTestId('delete-row-btn')

      fireEvent.click(deleteRowButton)
    })
  })

  it('deletes vuln (not confirmed)', () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    window.confirm = vi.fn(() => false)

    const deleteRowButton = screen.getByTestId('delete-row-btn')

    fireEvent.click(deleteRowButton)
  })

  it('sets tag', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])
    })

    const tagButton = screen.getAllByTestId('tag-btn')[0]

    fireEvent.click(tagButton)
  })

  it('sets tag (error)', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    const tagButton = screen.getAllByTestId('tag-btn')[0]

    fireEvent.click(tagButton)

    await waitFor(() => {
      expect(screen.getByText('No items selected')).toBeInTheDocument()
    })
  })

  it('unsets tag', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])
    })

    const tagButton = screen.getAllByTestId('tag-dropdown-btn')[0]

    fireEvent.click(tagButton)

    vi.spyOn(httpClient, 'post').mockResolvedValue('')
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    const tagMultipleButton = screen.getByTestId('vuln_set_multiple_tag')

    fireEvent.click(tagMultipleButton)

    await waitFor(() => {
      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()

      const tagsField = screen.getByTestId('tags-field')
      const tagsInput = tagsField.querySelector('input')!
      const saveButton = screen.getByRole('button', { name: 'Save' })

      fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
      fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })
      fireEvent.click(saveButton)
    })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <VulnListPage />,
      path: '/storage/vuln/list',
    })

    const tagMultipleButton = screen.getByTestId('vuln_unset_multiple_tag')

    fireEvent.click(tagMultipleButton)

    await waitFor(() => {
      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })
})
