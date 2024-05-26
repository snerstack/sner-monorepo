import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import httpClient from '@/lib/httpClient'
import ProfilePage from '@/routes/auth/profile'
import WebAuthnEditPage from '@/routes/auth/profile/webauthn/edit'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const loader = () => Promise.resolve({ id: 1, name: 'dummy' })

describe('Webauthn edit page', () => {
  it('shows form', async () => {
    renderWithProviders({
      element: <WebAuthnEditPage />,
      path: '/auth/profile/webauthn/edit/1',
      loader: loader,
    })

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
      expect(listItems.includes('Edit WebAuthn credential')).toBeTruthy()
      expect(screen.getByLabelText('Name')).toHaveValue('dummy')
    })
  })

  it('edits webauthn credential name', async () => {
    renderWithProviders({
      element: <WebAuthnEditPage />,
      path: '/auth/profile/webauthn/edit/1',
      loader: loader,
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

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: { message: 'dummy success' },
    })

    await waitFor(() => {
      const addressInput = screen.getByLabelText('Name')
      const editButton = screen.getByRole('button', { name: 'Edit' })
      fireEvent.change(addressInput, { target: { value: 'newname' } })
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('dummy success')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
    })
  })
})
