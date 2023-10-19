import LoginPage from '@/routes/auth/login'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import RootPage from '@/routes/root'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

class MockPublicKeyCredential {
  constructor() {}
  static isConditionalMediationAvailable(): Promise<boolean> {
    return Promise.resolve(false)
  }
  static isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> {
    return Promise.resolve(false)
  }
}

describe('Login Webauthn page', () => {
  Object.defineProperty(navigator, 'credentials', {
    value: {
      get: vi.fn().mockResolvedValue({
        rawId: new ArrayBuffer(64),
        id: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        response: {
          authenticatorData: new ArrayBuffer(32),
          clientDataJSON: new ArrayBuffer(128),
          signature: new ArrayBuffer(64),
        },
        type: 'public-key',
      }),
    },
    writable: false,
  })

  it('webauthn login', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    window.PublicKeyCredential = MockPublicKeyCredential as any

    vi.spyOn(httpClient, 'post')
      .mockResolvedValueOnce({
        data: 'uQABaXB1YmxpY0tlebkAA2RycElkaWxvY2FsaG9zdGljaGFsbGVuZ2VYIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcGFsbG93Q3JlZGVudGlhbHOBuQACZHR5cGVqcHVibGljLWtleWJpZFhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      })
      .mockResolvedValueOnce({
        data: {
          id: 1,
          username: 'test_user',
          email: 'user@test.com',
          roles: ['user'],
        },
      })

    await waitFor(() => {
      expect(screen.getAllByRole('list')[0]).toHaveTextContent('WebAuthn Login')
    })
  })

  it('webauthn login (client-side error)', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    window.PublicKeyCredential = MockPublicKeyCredential as any

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: 'invalid',
    })

    await waitFor(() => {
      expect(screen.getAllByRole('list')[0]).toHaveTextContent('WebAuthn Login')
    })
  })

  it('webauthn login (unauthorized error)', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    window.PublicKeyCredential = MockPublicKeyCredential as any

    vi.spyOn(httpClient, 'post')
      .mockResolvedValueOnce({
        data: 'uQABaXB1YmxpY0tlebkAA2RycElkaWxvY2FsaG9zdGljaGFsbGVuZ2VYIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcGFsbG93Q3JlZGVudGlhbHOBuQACZHR5cGVqcHVibGljLWtleWJpZFhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      })
      .mockRejectedValueOnce(errorResponse({ message: 'Unauthorized', code: 401 }))

    await waitFor(() => {
      expect(screen.getAllByRole('list')[0]).toHaveTextContent('WebAuthn Login')
    })
  })
})
