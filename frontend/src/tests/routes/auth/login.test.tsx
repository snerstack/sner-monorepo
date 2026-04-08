import LoginPage from '@/routes/auth/login'
import TOTPLoginPage from '@/routes/auth/login_totp'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import RootPage from '@/routes/root'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'react-toastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const mockedSetSearchParams = vi.fn<(params: URLSearchParams) => void>()
let mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
  const mod = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...mod,
    useSearchParams: (): [URLSearchParams, (p: URLSearchParams) => void] => [mockSearchParams, mockedSetSearchParams],
  }
})

describe('Login page', () => {
  const toastErrorMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(toast, 'error').mockImplementation(toastErrorMock)
    mockSearchParams = new URLSearchParams()
  })

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

    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 401, message: 'Invalid credentials' }))

    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.change(passwordInput, { target: { value: 'test_password' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
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

    vi.spyOn(httpClient, 'post')
      .mockResolvedValueOnce({
        data: {
          webauthn_login: true,
        },
      })
      .mockResolvedValueOnce({})

    const usernameInput = screen.getByLabelText('Username')
    const loginButton = screen.getByRole('button')

    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('To login with registered Webauthn authenticator')).toBeInTheDocument()
    })
  })

  it('handles OIDC error from query parameter', async () => {
    const errorCode = 'USER_DISABLED'
    const expectedMessage = 'Your account is disabled.'
    mockSearchParams = new URLSearchParams(`?oidc_error=${errorCode}`)

    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMessage)
    })

    expect(mockedSetSearchParams).toHaveBeenCalled()

    const lastCall = mockedSetSearchParams.mock.lastCall

    if (lastCall) {
      const params = lastCall[0]
      expect(params.has('oidc_error')).toBe(false)
    }
  })

  it('shows generic error for unknown OIDC error code', async () => {
    mockSearchParams = new URLSearchParams('?oidc_error=UNKNOWN_CODE')

    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred during login.')
    })
  })
})
