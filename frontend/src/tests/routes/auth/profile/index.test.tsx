import ProfilePage from '@/routes/auth/profile'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Profile page', () => {
  it('shows profile data', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () =>
        Promise.resolve({
          api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
          has_apikey: true,
          email: 'user@test.com',
          username: 'test_user',
          has_totp: true,
          webauthn_credentials: [],
        }),
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
      expect(screen.getByText('username').nextSibling!.firstChild).toHaveTextContent('test_user')
      expect(screen.getByText('email').nextSibling!.firstChild).toHaveTextContent('user@test.com')
      expect(screen.getByText('2fa authentication').nextSibling!.firstChild).toHaveTextContent('Enabled')
      expect(screen.getByText('apikey').nextSibling!.lastChild).toHaveTextContent('apikey set')
      expect(screen.getByText('api_networks').nextSibling!.lastChild).toHaveTextContent('127.0.0.0/24, 0.0.0.0/0')
    })
  })

  it('shows profile (no email, disabled 2fa)', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () =>
        Promise.resolve({
          api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
          has_apikey: true,
          email: null,
          username: 'test_user',
          has_totp: false,
          webauthn_credentials: [],
        }),
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
      expect(screen.getByText('username').nextSibling!.firstChild).toHaveTextContent('test_user')
      expect(screen.getByText('email').nextSibling!.firstChild).toHaveTextContent('None')
      expect(screen.getByText('2fa authentication').nextSibling!.firstChild).toHaveTextContent('Disabled')
      expect(screen.getByText('apikey').nextSibling!.lastChild).toHaveTextContent('apikey set')
      expect(screen.getByText('api_networks').nextSibling!.lastChild).toHaveTextContent('127.0.0.0/24, 0.0.0.0/0')
    })
  })

  it('generates apikey', async () => {
    renderWithProviders({
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
    })

    await waitFor(() => {
      const generateApiKeyButton = screen.getByText('Generate')!

      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
        data: {
          apikey: 'test_api_key_value',
        },
      })

      fireEvent.click(generateApiKeyButton)

      expect(screen.getByText('new apikey test_api_key_value'))
    })
  })

  it('revokes apikey', async () => {
    renderWithProviders({
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
    })

    await waitFor(() => {
      const revokeApiKeyButton = screen.getByText('Revoke')!

      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
        data: {
          message: 'Apikey successfully revoked.',
        },
      })

      fireEvent.click(revokeApiKeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Apikey successfully revoked.'))
    })
  })
})
