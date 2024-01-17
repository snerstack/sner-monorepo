import ProfilePage from '@/routes/auth/profile'
import ChangePasswordPage from '@/routes/auth/profile/changepassword'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Change password page', () => {
  it('shows form', () => {
    renderWithProviders({
      element: <ChangePasswordPage />,
      path: '/auth/profile/changepassword',
    })
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Repeat new password')).toHaveValue('')
    expect(screen.getByRole('button')).toHaveValue('Change password')
  })

  it('changes password with wrong current password', async () => {
    renderWithProviders({
      element: <ChangePasswordPage />,
      path: '/auth/profile/changepassword',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      errorResponse({ code: 400, message: 'Invalid current password.' }),
    )

    const currentPasswordInput = screen.getByLabelText('Current password')
    const newPasswordInput = screen.getByLabelText('New password')
    const repeatNewPasswordInput = screen.getByLabelText('Repeat new password')
    const changePasswordButton = screen.getByRole('button', { name: 'Change password' })

    fireEvent.change(currentPasswordInput, { target: { value: 'wrong_current_password' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword7!' } })
    fireEvent.change(repeatNewPasswordInput, { target: { value: 'NewPassword7!' } })

    fireEvent.click(changePasswordButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid current password.')).toBeInTheDocument()
    })
  })

  it('changes password with new weak password', async () => {
    renderWithProviders({
      element: <ChangePasswordPage />,
      path: '/auth/profile/changepassword',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      errorResponse({ code: 400, errors: { password1: ['Password too short. At least 10 characters required.'] } }),
    )

    const currentPasswordInput = screen.getByLabelText('Current password')
    const newPasswordInput = screen.getByLabelText('New password')
    const repeatNewPasswordInput = screen.getByLabelText('Repeat new password')
    const changePasswordButton = screen.getByRole('button', { name: 'Change password' })

    fireEvent.change(currentPasswordInput, { target: { value: 'current_password' } })
    fireEvent.change(newPasswordInput, { target: { value: 'short' } })
    fireEvent.change(repeatNewPasswordInput, { target: { value: 'short' } })

    fireEvent.click(changePasswordButton)

    await waitFor(() => {
      expect(screen.getByText('Password too short. At least 10 characters required.')).toBeInTheDocument()
    })
  })

  it('changes password successfully', async () => {
    renderWithProviders({
      element: <ChangePasswordPage />,
      path: '/auth/profile/changepassword',
      routes: [
        {
          element: <ProfilePage />,
          path: '/auth/profile',
          loader: () =>
            Promise.resolve({
              api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
              has_apikey: true,
              email: 'user@test.com',
              username: 'test_user',
              has_totp: false,
              webauthn_credentials: [],
            }),
        },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({ data: { message: 'Password successfully changed.' } })

    const currentPasswordInput = screen.getByLabelText('Current password')
    const newPasswordInput = screen.getByLabelText('New password')
    const repeatNewPasswordInput = screen.getByLabelText('Repeat new password')
    const changePasswordButton = screen.getByRole('button', { name: 'Change password' })

    fireEvent.change(currentPasswordInput, { target: { value: 'current_password' } })
    fireEvent.change(newPasswordInput, { target: { value: 'new_strong_password' } })
    fireEvent.change(repeatNewPasswordInput, { target: { value: 'new_strong_password' } })

    fireEvent.click(changePasswordButton)

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
      expect(screen.getByText('Password successfully changed.')).toBeInTheDocument()
    })
  })
})
