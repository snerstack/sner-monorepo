import ProfilePage from '@/routes/auth/profile'
import TOTPPage from '@/routes/auth/profile/totp'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

import { errorResponse } from '@/tests/utils/errorResponse'
import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('TOTP page', () => {
  it('shows totp data', async () => {
    renderWithProviders({
      element: <TOTPPage />,
      path: '/auth/profile/totp',
      loader: () =>
        Promise.resolve({
          provisioning_url:
            'otpauth://totp/test:user?digits=6&secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&algorithm=SHA1&issuer=test&period=30',
          secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('User profile')).toBeTruthy()
      expect(listItems.includes('2-factor authentication setup (enable)')).toBeTruthy()
      expect(screen.getByText('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBeInTheDocument()
    })
  })

  it('enters invalid code', async () => {
    renderWithProviders({
      element: <TOTPPage />,
      path: '/auth/profile/totp',
      loader: () =>
        Promise.resolve({
          provisioning_url:
            'otpauth://totp/test:user?digits=6&secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&algorithm=SHA1&issuer=test&period=30',
          secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        }),
    })

    await waitFor(() => {
      vi.spyOn(httpClient, 'post').mockRejectedValueOnce(errorResponse({ code: 400, message: 'Invalid code.' }))

      const totpCodeInput = screen.getByLabelText('TOTP Code')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      fireEvent.change(totpCodeInput, { target: { value: 'invalid' } })
      fireEvent.click(submitButton)

      expect(screen.getByText('Invalid code.')).toBeInTheDocument()
    })
  })

  it('enters correct code', async () => {
    renderWithProviders({
      element: <TOTPPage />,
      path: '/auth/profile/totp',
      loader: () =>
        Promise.resolve({
          provisioning_url:
            'otpauth://totp/test:user?digits=6&secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&algorithm=SHA1&issuer=test&period=30',
          secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        }),
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

    await waitFor(() => {
      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({ data: { message: 'TOTP successfully enabled.' } })

      const totpCodeInput = screen.getByLabelText('TOTP Code')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      fireEvent.change(totpCodeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('TOTP successfully enabled.')).toBeInTheDocument()
    })
  })

  it('shows totp (disable)', async () => {
    renderWithProviders({
      element: <TOTPPage />,
      path: '/auth/profile/totp',
      loader: () =>
        Promise.resolve({
          provisioning_url: '',
          secret: '',
        }),
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('User profile')).toBeTruthy()
      expect(listItems.includes('Disable')).toBeTruthy()
    })
  })
})
