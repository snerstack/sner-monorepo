import UserAddPage from '@/routes/auth/user/add'
import UserListPage from '@/routes/auth/user/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('User add page', () => {
  it('shows form', () => {
    renderWithProviders({
      element: <UserAddPage />,
      path: '/auth/user/add',
    })

    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.includes('Users')).toBeTruthy()
    expect(listItems.includes('Add')).toBeTruthy()
    expect(screen.getByLabelText('Username')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('API Networks')).toHaveValue('')
  })

  it('adds new user', async () => {
    renderWithProviders({
      element: <UserAddPage />,
      path: '/auth/user/add',
      routes: [{ element: <UserListPage />, path: '/auth/user/list' }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Successfully added a new user.',
      },
    })

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const userRoleCheckbox = screen.getByLabelText('user')
    const adminRoleCheckbox = screen.getByLabelText('admin')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(userRoleCheckbox)
    fireEvent.click(adminRoleCheckbox)
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Successfully added a new user.')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('Users')
    })
  })

  it('adds new user (error)', () => {
    renderWithProviders({
      element: <UserAddPage />,
      path: '/auth/user/add',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: '500', message: 'Internal server error' }))

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const addButton = screen.getByRole('button', { name: 'Add' })

    fireEvent.change(usernameInput, { target: { value: '' } })
    fireEvent.click(addButton)

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(addButton)
  })
})
