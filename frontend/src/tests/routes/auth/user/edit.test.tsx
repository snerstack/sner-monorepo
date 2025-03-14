import UserEditPage from '@/routes/auth/user/edit'
import UserListPage from '@/routes/auth/user/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('User edit page', () => {
  it('edits user', async () => {
    renderWithProviders({
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
      routes: [{ element: <UserListPage />, path: '/auth/user/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Successfully edited a user.',
      },
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Users')).toBeTruthy()
      expect(listItems.includes('Edit')).toBeTruthy()

      const usernameInput = screen.getByLabelText('Username')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      expect(usernameInput).toHaveValue('test_user')
      expect(screen.getByLabelText('Email')).toHaveValue('user@test.com')
      expect(screen.getByLabelText('admin')).toBeChecked()
      expect(screen.getByLabelText('user')).toBeChecked()
      expect(screen.getByLabelText('Password')).toHaveValue('')
      expect(screen.getByLabelText('API Networks')).toHaveValue('127.0.0.0/24\n0.0.0.0/0')

      fireEvent.change(usernameInput, { target: { value: 'edited_user' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Successfully edited a user.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Users')
    })
  })

  it('edits user', async () => {
    renderWithProviders({
      element: <UserEditPage />,
      path: '/auth/user/edit/1',
      loader: () =>
        Promise.resolve({
          active: true,
          api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
          email: '',
          id: 1,
          roles: ['admin', 'user'],
          username: 'test_user',
        }),
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 500, message: 'Internal server error' }))

    await waitFor(() => {
      const usernameInput = screen.getByLabelText('Username')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(usernameInput, { target: { value: 'edited_user' } })
      fireEvent.click(editButton)
    })
  })

  it('tries edit user with blank username', async () => {
    renderWithProviders({
      element: <UserEditPage />,
      path: '/auth/user/edit/1',
      loader: () =>
        Promise.resolve({
          active: true,
          api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
          email: '',
          id: 1,
          roles: ['admin', 'user'],
          username: 'test_user',
        }),
    })

    await waitFor(() => {
      const usernameInput = screen.getByLabelText('Username')
      const editButton = screen.getByRole('button', { name: 'Edit' })

      fireEvent.change(usernameInput, { target: { value: '' } })
      fireEvent.click(editButton)

      expect(screen.getByText('Username is required.')).toBeInTheDocument()
    })
  })
})
