import LoginPage from '@/routes/auth/login'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import RootPage from '@/routes/root'
import { arrayBufferToBase64 } from '@/utils'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { encode as cborEncode } from 'cbor-x'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Login Webauthn page', () => {
  it('show webauthn login not supported', async () => {
    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [{ path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> }],
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({ data: { webauthn_login: true } })

    const usernameInput = screen.getByLabelText('Username')
    const loginButton = screen.getByRole('button')
    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('WebAuthn is not supported')).toBeInTheDocument()
    })
  })

  it('does webauthn login', async () => {
    const publicKeyCredentialIdMock = new Uint8Array(64)
    const publicKeyCredentialRequestOptionsMock = {
      publicKey: {
        rpId: 'localhost',
        challenge: new Uint8Array(32),
        allowCredentials: [{ type: 'public-key', id: publicKeyCredentialIdMock }],
      },
    }

    vi.stubGlobal('PublicKeyCredential', 'dummy')
    vi.stubGlobal('navigator', {
      credentials: {
        get: vi.fn().mockResolvedValue({
          rawId: new ArrayBuffer(64),
          id: arrayBufferToBase64(publicKeyCredentialIdMock),
          response: {
            authenticatorData: new ArrayBuffer(32),
            clientDataJSON: new ArrayBuffer(128),
            signature: new ArrayBuffer(64),
          },
          type: 'public-key',
        }),
      },
    })

    vi.spyOn(httpClient, 'post')
      // login username
      .mockResolvedValueOnce({ data: { webauthn_login: true } })
      // get pkcr options
      .mockResolvedValueOnce({ data: arrayBufferToBase64(cborEncode(publicKeyCredentialRequestOptionsMock)) })
      // authenticate
      .mockResolvedValueOnce({
        data: {
          id: 1,
          username: 'test_user',
          email: 'user@test.com',
          roles: ['user'],
        },
      })

    renderWithProviders({
      element: <LoginPage />,
      path: '/auth/login',
      routes: [
        { path: '/auth/login_webauthn', element: <WebAuthnLoginPage /> },
        { path: '/', element: <RootPage /> },
      ],
    })

    const usernameInput = screen.getByLabelText('Username')
    const loginButton = screen.getByRole('button')
    fireEvent.change(usernameInput, { target: { value: 'test_user' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
      expect(screen.getByText('Slow Network Recon Service')).toBeInTheDocument()
    })
  })
})
