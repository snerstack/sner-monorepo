import HostViewPage from '@/routes/storage/host/view'
import VulnViewPage from '@/routes/storage/vuln/view'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testDeleteRow } from '@/tests/helpers/testDeleteRow'
import { testSelectAllRows } from '@/tests/helpers/testSelectAllRows'
import { testSelectNoneRows } from '@/tests/helpers/testSelectNoneRows'
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
  })

  it('shows host with toolboxes and via_target column', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'true')
    sessionStorage.setItem('dt_viatarget_column_visible', 'true')
    localStorage.setItem('host_view_tabs_active', 'service')

    renderWithProviders({ element: <HostViewPage />, path: '/storage/host/view/1', loader: loader })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Host')).toBeTruthy()
      expect(listItems.includes('127.4.4.4 testhost.testdomain.test<script>alert(1);</script>')).toBeTruthy()
    })

    await waitFor(() => {
      // toBeVisible does not account collapse
      expect(screen.getByTestId('host_view_service_table_toolbox')).not.toHaveClass('collapse')
    })
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

    const updateRouteMock = vi.spyOn(httpClient, 'post').mockResolvedValue({})

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const tagsCell = await screen.findByTestId('host_tags_annotate')
    fireEvent.doubleClick(tagsCell)

    expect(await screen.findByRole('dialog')).toBeVisible()

    const tagsInput = await screen.findByPlaceholderText('Tags')
    fireEvent.change(tagsInput, { target: { value: 'edited_tag' } })

    const saveButton = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(updateRouteMock).toBeCalledWith('/backend/storage/host/annotate/1', expect.anything())
  })

  it('annotates service', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const serviceTab = screen.getByTestId('service_tab')
      fireEvent.click(serviceTab)

      testAnnotate({ tagsId: 'service_tags_annotate', commentId: 'service_comment_annotate' })
    })
  })

  it('annotates vuln', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsTab = screen.getByTestId('vuln_tab')
      fireEvent.click(vulnsTab)

      testAnnotate({ tagsId: 'vuln_tags_annotate', commentId: 'vuln_comment_annotate' })
    })
  })

  it('annotates note', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      testAnnotate({ tagsId: 'note_tags_annotate', commentId: 'note_comment_annotate' })
    })
  })

  it('annotates versioninfo', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const versioninfosTab = screen.getByTestId('versioninfo_tab')
      fireEvent.click(versioninfosTab)

      testAnnotate({ tagsId: 'versioninfo_tags_annotate', commentId: 'versioninfo_comment_annotate' })
    })
  })

  it('annotates vulnsearch', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsearchesTab = screen.getByTestId('vulnsearch_tab')
      fireEvent.click(vulnsearchesTab)

      testAnnotate({ tagsId: 'vulnsearch_tags_annotate', commentId: 'vulnsearch_comment_annotate' })
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

  it('sets multiple versioninfo tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const versioninfosTab = screen.getByTestId('versioninfo_tab')
      const tagMultipleButton = screen.getByTestId('versioninfo_set_multiple_tag')

      fireEvent.click(versioninfosTab)
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
      const versioninfosTab = screen.getByTestId('versioninfo_tab')
      const tagMultipleButton = screen.getByTestId('versioninfo_unset_multiple_tag')

      fireEvent.click(versioninfosTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })

  it('sets multiple vulnsearch tags', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsearchesTab = screen.getByTestId('vulnsearch_tab')
      const tagMultipleButton = screen.getByTestId('vulnsearch_set_multiple_tag')

      fireEvent.click(vulnsearchesTab)
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
      const vulnsearchesTab = screen.getByTestId('vulnsearch_tab')
      const tagMultipleButton = screen.getByTestId('vulnsearch_unset_multiple_tag')

      fireEvent.click(vulnsearchesTab)
      fireEvent.click(tagMultipleButton)

      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
    })
  })

  it('selects and unselects all service rows', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const servicesTab = screen.getByTestId('service_tab')
      fireEvent.click(servicesTab)

      testSelectAllRows({ buttonId: 'host_view_service_select_all' })
      testSelectNoneRows({ buttonId: 'host_view_service_unselect_all' })
    })
  })

  it('selects and unselects all vuln rows', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsTab = screen.getByTestId('vuln_tab')
      fireEvent.click(vulnsTab)

      testSelectAllRows({ buttonId: 'host_view_vuln_select_all' })
      testSelectNoneRows({ buttonId: 'host_view_vuln_unselect_all' })
    })
  })

  it('selects and unselects all note rows', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      testSelectAllRows({ buttonId: 'host_view_note_select_all' })
      testSelectNoneRows({ buttonId: 'host_view_note_unselect_all' })
    })
  })

  it('selects and unselects all versioninfo rows', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const versioninfosTab = screen.getByTestId('versioninfo_tab')
      fireEvent.click(versioninfosTab)

      testSelectAllRows({ buttonId: 'host_view_versioninfo_select_all' })
      testSelectNoneRows({ buttonId: 'host_view_versioninfo_unselect_all' })
    })
  })

  it('selects and unselects all vulnsearch rows', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const vulnsearchesTab = screen.getByTestId('vulnsearch_tab')

      fireEvent.click(vulnsearchesTab)

      testSelectAllRows({ buttonId: 'host_view_vulnsearch_select_all' })
      testSelectNoneRows({ buttonId: 'host_view_vulnsearch_unselect_all' })
    })
  })

  it('deletes host', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    const reloadMock = vi.fn()
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.spyOn(httpClient, 'post').mockResolvedValue('')
    vi.stubGlobal('location', {reload: reloadMock})

    await waitFor(() => {
      const deleteButton = screen.getAllByTestId('delete-btn')[0]
      fireEvent.click(deleteButton)
    })
    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalled()
    })
  })

  it('deletes service', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      testDeleteRow({ buttonId: 'service-delete-row-btn' })
    })
  })

  it('deletes vuln', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      testDeleteRow({ buttonId: 'vuln-delete-row-btn' })
    })
  })
  it('deletes note', async () => {
    renderWithProviders({
      element: <HostViewPage />,
      path: '/storage/host/view/1',
      loader: loader,
    })

    await waitFor(() => {
      const notesTab = screen.getByTestId('note_tab')
      fireEvent.click(notesTab)

      testDeleteRow({ buttonId: 'note-delete-row-btn' })
    })
  })
})
