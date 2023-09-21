import ChangePasswordPage from '@/routes/auth/profile/changepassword'
import { renderWithProviders } from '@/tests/renderWithProviders'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

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

  it('change password with wrong current password', async () => {
    renderWithProviders({
      element: <ChangePasswordPage />,
      path: '/auth/profile/changepassword',
    })

    const error = new AxiosError()
    error.response = { data: { error: { code: 400, message: 'Invalid current password.' } } } as AxiosResponse<{
      error: { code: number; message: string }
    }>

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(error)

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
})
