import HostViewPage from '@/routes/storage/host/view'
import VulnViewPage from '@/routes/storage/vuln/view'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () =>
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
  })

describe('Host view page', () => {
  sessionStorage.setItem('dt_toolboxes_visible', 'false')

  it('shows host', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
    })

    sessionStorage.setItem('dt_toolboxes_visible', 'true')
    sessionStorage.setItem('dt_viatarget_column_visible', 'true')
  })

  it('shows host (no hostname)', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: () =>
        Promise.resolve({
          address: '127.4.4.4',
          comment: '',
          created: 'Mon, 17 Jul 2023 20:01:09 GMT',
          hostname: '',
          id: 1,
          modified: 'Fri, 01 Sep 2023 12:01:37 GMT',
          notesCount: 3,
          os: 'Test Linux 1',
          rescan_time: 'Mon, 17 Jul 2023 20:01:09 GMT',
          servicesCount: 1,
          tags: ['reviewed'],
          vulnsCount: 12,
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.4.4.4')).toBeTruthy()
    })
  })

  it('sets tag', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    const tagButton = screen.getAllByTestId('tag-btn')[0]

    fireEvent.click(tagButton)
  })

  it('views vuln', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
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
      const vulnsTab = screen.getByTestId('vuln_tab')
      fireEvent.click(vulnsTab)
    })

    await waitFor(() => {
      const vulnLink = screen.getAllByTestId('vuln-link')[0]
      fireEvent.click(vulnLink)
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Vuln')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
      expect(listItems.includes('aggregable vuln (x.agg)')).toBeTruthy()
    })
  })

  it('annotates host', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const tagsCell = screen.getByTestId('host_tags_annotate')
      const commentCell = screen.getByTestId('host_comment_annotate')

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })

  it('annotates service', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
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

  it('annotates vuln', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const tagsCell = screen.getAllByTestId('vuln_tags_annotate')[0]
      const commentCell = screen.getAllByTestId('vuln_comment_annotate')[0]

      fireEvent.doubleClick(tagsCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCell)
      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })

  it('annotates note', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const tagsCell = screen.getAllByTestId('note_tags_annotate')[0]
      const tagsCellEmptyComment = screen.getAllByTestId('note_tags_annotate')[1]
      const commentCell = screen.getAllByTestId('note_comment_annotate')[0]
      const commentCellEmptyComment = screen.getAllByTestId('note_comment_annotate')[1]

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

  it('sets multiple service tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const servicesTab = screen.getByTestId('service_tab')
      const tagMultipleButton = screen.getByTestId('service_set_multiple_tag')

      fireEvent.click(servicesTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()
    })
  })

  it('unsets multiple service tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const servicesTab = screen.getByTestId('service_tab')
      const tagMultipleButton = screen.getByTestId('service_unset_multiple_tag')

      fireEvent.click(servicesTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })

  it('sets multiple vuln tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsTab = screen.getByTestId('vuln_tab')
      const tagMultipleButton = screen.getByTestId('vuln_set_multiple_tag')

      fireEvent.click(vulnsTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()
    })
  })

  it('unsets multiple vuln tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsTab = screen.getByTestId('vuln_tab')
      const tagMultipleButton = screen.getByTestId('vuln_unset_multiple_tag')

      fireEvent.click(vulnsTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })

  it('sets multiple note tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      const tagMultipleButton = screen.getByTestId('note_set_multiple_tag')

      fireEvent.click(notesTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()
    })
  })

  it('unsets multiple note tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      const tagMultipleButton = screen.getByTestId('note_unset_multiple_tag')

      fireEvent.click(notesTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })

  it('deletes host', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    window.location = {
      reload: vi.fn(),
    } as unknown as Location
    window.confirm = vi.fn(() => true)

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      const deleteButton = screen.getAllByTestId('delete-btn')[0]

      fireEvent.click(deleteButton)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  it('deletes service', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[0])

      window.confirm = vi.fn(() => true)

      const deleteRowButton = screen.getByTestId('service-delete-row-btn')

      fireEvent.click(deleteRowButton)
    })
  })

  it('deletes vuln', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[1])

      window.confirm = vi.fn(() => true)

      const deleteRowButton = screen.getByTestId('vuln-delete-row-btn')

      fireEvent.click(deleteRowButton)
    })
  })
  it('deletes note', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue('')

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      // selects first row
      const cells = screen.getAllByRole('cell')
      fireEvent.click(cells[2])

      window.confirm = vi.fn(() => true)

      const deleteRowButton = screen.getByTestId('note-delete-row-btn')

      fireEvent.click(deleteRowButton)
    })
  })
})
