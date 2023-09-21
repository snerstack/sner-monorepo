import LoginPage from '@/routes/auth/login'
import TOTPLoginPage from '@/routes/auth/login_totp'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import RootPage from '@/routes/root'
import { renderWithProviders } from '@/tests/renderWithProviders'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

describe('Login page', () => {
  it('shows form', () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
    })
    expect(screen.getByLabelText('Username')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByRole('button')).toHaveValue('Login')
  })

  it('login with invalid credentials', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
    })

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce({ error: { code: 401, message: 'Invalid credentials.' } })

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument()
    })
  })

  it('login with valid credentials', async () => {
    renderWithProviders({ element: <LoginPage />, path: '/auth/login', routes: [{ path: '/', element: <RootPage /> }] })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        id: 1,
        username: 'test_user',
        email: 'user@test.com',
        roles: ['user'],
      },
    })

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Slow Network Recon Service')
    })
  })

  it('totp login redirect', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [{ path: '/auth/login_totp', element: <TOTPLoginPage /> }],
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

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('Login with 2FA')
    })
  })

  it('webauthn login redirect', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [{ path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        webauthn_login: true,
      },
    })

    const usernameInput = screen.getByLabelText('Username')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('To login with registered Webauthn authenticator')).toBeInTheDocument()
    })
  })
})
