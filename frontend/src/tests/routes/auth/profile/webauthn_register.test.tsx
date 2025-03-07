import { encode as cborEncode } from 'cbor-x'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'
import ProfilePage from '@/routes/auth/profile'
import WebAuthnRegisterPage from '@/routes/auth/profile/webauthn/register'
import { arrayBufferToBase64 } from '@/utils'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

//const loader = () => Promise.resolve({ id: 1, name: 'dummy' })

describe('Webauthn register page', () => {
  it('registers credential', async () => {
    const publicKeyCredentialCreationOptionsMock = {}
    vi.stubGlobal('PublicKeyCredential', 'dummy')
    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn().mockResolvedValue({
          response: {
            clientDataJson: new ArrayBuffer(0),
            attestationObject: new ArrayBuffer(0)
          }
        }),
      },
    })

    vi.spyOn(httpClient, 'post')
    // get pkcc options
    .mockResolvedValueOnce({ data: arrayBufferToBase64(cborEncode(publicKeyCredentialCreationOptionsMock)) })
    // register credential
    .mockResolvedValueOnce({ data: { message: 'dummy success' }})

    renderWithProviders({
      element: <WebAuthnRegisterPage />,
      path: '/auth/profile/webauthn/register',
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
      expect(screen.getByText('Prepared')).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'newcred' } })
      fireEvent.click(screen.getByRole('button', {name: 'Register'}))
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
    })
  })
})
