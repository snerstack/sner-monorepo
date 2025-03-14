import UserEditPage from '@/routes/auth/user/edit'
import UserListPage from '@/routes/auth/user/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('User list page', () => {
  it('shows table of users', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    await waitFor(() => {
      expect(screen.getByText('test_admin')).toBeInTheDocument()
      expect(screen.getByText('test_user')).toBeInTheDocument()
      expect(screen.getByText('test_operator')).toBeInTheDocument()
      expect(screen.getAllByRole('row')[1].textContent).toContain('1')
      expect(screen.getAllByRole('row')[2].textContent).toContain('3')
      expect(screen.getAllByRole('row')[3].textContent).toContain('11')
    })
  })

  it('generates apikey', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { apikey: 'test_apikey' } })

    await waitFor(() => {
      const apikeyButton = screen.getAllByTestId('apikey-btn')[1]

      fireEvent.click(apikeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('API key: test_apikey')).toBeInTheDocument()
      const modalBackground = screen.getByTestId('apikey-modal').parentElement!
      fireEvent.click(modalBackground)
    })
  })

  it('generates apikey (error)', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValue(errorResponse({ message: 'Server error.' }))

    await waitFor(() => {
      const apikeyButton = screen.getAllByTestId('apikey-btn')[1]

      fireEvent.click(apikeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Server error.')).toBeInTheDocument()
    })
  })

  it('revokes apikey', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { message: 'Apikey successfully revoked.' } })

    await waitFor(() => {
      const apikeyButton = screen.getAllByTestId('apikey-btn')[0]

      fireEvent.click(apikeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Apikey successfully revoked.')).toBeInTheDocument()
    })
  })

  it('redirects to edit page', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
      routes: [
        {
          element: <UserEditPage />,
          path: '/auth/user/edit/1',
          loader: () =>
            Promise.resolve({
              active: true,
              api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
              email: 'user@test.com',
              id: 1,
              roles: ['admin', 'user'],
              username: 'test_user',
            }),
        },
      ],
    })

    await waitFor(() => {
      const editButton = screen.getAllByTestId('edit-btn')[0]

      fireEvent.click(editButton)
    })
  })

  it('deletes user', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    const backendMock = vi.spyOn(httpClient, 'post').mockResolvedValue('')
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

    await waitFor(() => {
      const deleteButton = screen.getAllByTestId('delete-btn')[0]
      fireEvent.click(deleteButton)
    })

    expect(backendMock).toBeCalledWith('/backend/auth/user/delete/1')
  })
})
