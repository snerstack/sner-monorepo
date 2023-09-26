import HostListPage from '@/routes/storage/host/list'
import HostViewPage from '@/routes/storage/host/view'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Host list page', () => {
  it('shows table of hosts', async () => {
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
  })

  it('views a host', async () => {
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

  it('annotates a host', async () => {
    renderWithProviders({
      element: <HostListPage />,
      path: '/storage/host/list',
    })

    await waitFor(async () => {
      const cells = await screen.findAllByRole('cell')
      const tagCell = cells[6].children[0]
      const commentCell = cells[7].children[0]

      fireEvent.doubleClick(tagCell)

      expect(screen.getByText('Annotate')).toBeInTheDocument()

      fireEvent.doubleClick(commentCell)

      expect(screen.getByText('Annotate')).toBeInTheDocument()
    })
  })
})
