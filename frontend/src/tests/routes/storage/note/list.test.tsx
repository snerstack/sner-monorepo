import HostViewPage from '@/routes/storage/host/view'
import NoteListPage from '@/routes/storage/note/list'
import NoteViewPage from '@/routes/storage/note/view'
import { testAnnotate } from '@/tests/helpers/testAnnotate'
import { testDeleteRow } from '@/tests/helpers/testDeleteRow'
import { testFilter } from '@/tests/helpers/testFilter'
import { testMultipleTags } from '@/tests/helpers/testMultipleTags'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Note list page', () => {
  it('shows table of notes', async () => {
    renderWithProviders({ element: <NoteListPage />, path: '/storage/note/list' })
    expect(screen.getByRole('list')).toHaveTextContent('Notes')

    await waitFor(() => {
      expect(screen.getByText('127.4.4.4')).toBeInTheDocument()
      expect(screen.getByText('testhost.testdomain.test<script>alert(1);</script>')).toBeInTheDocument()
      expect(screen.getByText('12345/tcp')).toBeInTheDocument()
      expect(screen.getByText('deb')).toBeInTheDocument()
      expect(screen.getByText('["cpe:/o:microsoft:windows_nt:3.5.1"]')).toBeInTheDocument()

      expect(screen.getByText('127.3.3.3')).toBeInTheDocument()
      expect(screen.getByText('testhost1.testdomain.test')).toBeInTheDocument()
      expect(screen.getByText('sner.testnote')).toBeInTheDocument()
      expect(screen.getByText('testnote data')).toBeInTheDocument()

      expect(screen.getByText('127.0.0.1')).toBeInTheDocument()
      expect(screen.getByText('46865/tcp')).toBeInTheDocument()
      expect(screen.getByText('testssl')).toBeInTheDocument()
    })
  })

  it('shows list of notes with toolboxes and via_target column', async () => {
    sessionStorage.setItem('dt_toolboxes_visible', 'true')
    sessionStorage.setItem('dt_viatarget_column_visible', 'true')

    renderWithProviders({ element: <NoteListPage />, path: '/storage/note/list' })

    await waitFor(() => {
      expect(screen.getByTestId('note_list_table_toolbox')).not.toHaveClass('collapse')
      expect(screen.getByText('via_target')).toBeVisible()
    })
  })

  it('views host', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
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
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    testFilter({ query: 'Host.address=="127.4.4.4"' })

    await waitFor(() => {
      expect(screen.getByRole('link', {'name': '127.4.4.4'})).toBeInTheDocument()
      expect(screen.queryByText('127.3.3.3')).toBeNull()
      expect(screen.queryByText('127.128.129.130')).toBeNull()
    })
  })

  it('deletes host', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await waitFor(() => {
      testDeleteRow({ buttonId: 'delete-row-btn' })
    })
  })

  it('redirects to view page', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
      routes: [
        {
          element: <NoteViewPage />,
          path: '/storage/note/view/1',
          loader: () =>
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
            }),
        },
      ],
    })

    await waitFor(() => {
      const viewButton = screen.getAllByTestId('view-btn')[0]

      fireEvent.click(viewButton)
    })
  })

  it('annotates note', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await waitFor(() => {
      testAnnotate({ tagsId: 'note_tags_annotate', commentId: 'note_comment_annotate' })
    })
  })

  it('selects all notes', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await waitFor(() => {
      const selectAllButton = screen.getByTestId('note_select_all')

      fireEvent.click(selectAllButton)
    })
  })

  it('unselects all notes', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await waitFor(() => {
      const selectAllButton = screen.getByTestId('note_unselect_all')

      fireEvent.click(selectAllButton)
    })
  })

  it('sets multiple tags', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await testMultipleTags({ action: 'set', testId: 'note_set_multiple_tag' })
  })

  it('unsets multiple tags', async () => {
    renderWithProviders({
      element: <NoteListPage />,
      path: '/storage/note/list',
    })

    await testMultipleTags({ action: 'unset', testId: 'note_unset_multiple_tag' })
  })
})
