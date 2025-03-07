import LoginPage from '@/routes/auth/login'
import TOTPLoginPage from '@/routes/auth/login_totp'
import RootPage from '@/routes/root'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Login TOTP page', () => {
  it('totp login', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_totp', element: <TOTPLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        totp_login_required: true,
      },
    })

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(loginButton)

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        id: 1,
        username: 'test_user',
        email: 'user@test.com',
        roles: ['user'],
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Login with 2FA')

      const codeInput = screen.getByLabelText('TOTP Code')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
    })
  })

  it('totp login (wrong code)', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_totp', element: <TOTPLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        totp_login_required: true,
      },
    })

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(loginButton)

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 400, message: 'Invalid code.' }))

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Login with 2FA')

      const codeInput = screen.getByLabelText('TOTP Code')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      fireEvent.change(codeInput, { target: { value: 'wrong_code' } })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Invalid code.')).toBeInTheDocument()
    })
  })
})
