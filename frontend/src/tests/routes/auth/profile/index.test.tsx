import ProfilePage from '@/routes/auth/profile'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'
import { LSKEY_TAG_COLORS } from '@/lib/sner/tags'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

const defaultProfile = {
  username: 'test_user',
  email: 'user@test.com',
  has_totp: true,
  webauthn_credentials: [],
  api_networks: ['127.0.0.0/24', '0.0.0.0/0'],
  has_apikey: true,
}


describe('Profile page', () => {
  it('shows profile data', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile)
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
      expect(screen.getByText('username').nextSibling!.firstChild).toHaveTextContent('test_user')
      expect(screen.getByText('email').nextSibling!.firstChild).toHaveTextContent('user@test.com')
      expect(screen.getByText('2fa authentication').nextSibling!.firstChild).toHaveTextContent('Enabled')
      expect(screen.getByText('apikey').nextSibling!.lastChild).toHaveTextContent('apikey set')
      expect(screen.getByText('api networks').nextSibling!.lastChild).toHaveTextContent('127.0.0.0/24, 0.0.0.0/0')
    })
  })

  it('shows profile (no email, disabled 2fa)', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve({
        ...defaultProfile,
        email: null,
        has_totp: false
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('list')).toHaveTextContent('User profile')
      expect(screen.getByText('username').nextSibling!.firstChild).toHaveTextContent('test_user')
      expect(screen.getByText('email').nextSibling!.firstChild).toHaveTextContent('None')
      expect(screen.getByText('2fa authentication').nextSibling!.firstChild).toHaveTextContent('Disabled')
      expect(screen.getByText('apikey').nextSibling!.lastChild).toHaveTextContent('apikey set')
      expect(screen.getByText('api networks').nextSibling!.lastChild).toHaveTextContent('127.0.0.0/24, 0.0.0.0/0')
    })
  })

  it('generates apikey', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        apikey: 'test_api_key_value',
      },
    })

    await waitFor(() => {
      const generateApiKeyButton = screen.getByText('Generate')!
      fireEvent.click(generateApiKeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('new apikey test_api_key_value'))
    })
  })

  it('revokes apikey', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      data: {
        message: 'Apikey successfully revoked',
      },
    })

    await waitFor(() => {
      const revokeApiKeyButton = screen.getByText('Revoke')!
      fireEvent.click(revokeApiKeyButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Apikey successfully revoked'))
    })
  })

  it('changes color of tag', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    await waitFor(() => {
      const tag = screen.getAllByTestId('tag').filter((tag) => tag.textContent === 'dummy')[0]
      expect(tag).toBeInTheDocument()

      fireEvent.click(tag)
      expect(screen.getByText('Tag Configuration')).toBeInTheDocument()

      const colorInput = screen.getByTestId('tag-color-input')
      fireEvent.change(colorInput, { target: { value: '#28cd60' } })
      fireEvent.change(colorInput, { target: { value: '#fff' } })

      const colorPicker = screen.getByTestId('tag-color-picker').querySelectorAll('[role=slider]')[1]!
      fireEvent.mouseEnter(colorPicker)
      fireEvent.mouseDown(colorPicker)
      fireEvent.mouseMove(colorPicker, { clientX: 100 })
      fireEvent.mouseUp(colorPicker)

      const changeButton = screen.getByRole('button', { name: 'Change' })
      fireEvent.click(changeButton)
    })
  })

  it('changes color of tag (close without changing)', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    await waitFor(() => {
      const tag = screen.getAllByTestId('tag').filter((tag) => tag.textContent === 'dummy')[0]
      expect(tag).toBeInTheDocument()

      fireEvent.click(tag)
      expect(screen.getByText('Tag Configuration')).toBeInTheDocument()

      const modalBackground = screen.getByTestId('tag-config-modal').parentElement!
      fireEvent.click(modalBackground)
    })
  })  

  it('adds new tag', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    expect(!('newtag1' in JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!)))
    await waitFor(() => {
      const addTagInput = screen.getByPlaceholderText('add tag')
      const addTagButton = screen.getByTestId('newtag-btn')

      fireEvent.change(addTagInput, { target: { value: 'newtag1' } })
      fireEvent.click(addTagButton)
    })
    await waitFor(() => {
      expect('newtag1' in JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!))
    })
  })

  it('deletes dummy tag', async () => {
    renderWithProviders({
      element: <ProfilePage />,
      path: '/auth/profile',
      loader: () => Promise.resolve(defaultProfile),
    })

    expect('dummy' in JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!))

    await waitFor(() => {
      const deleteButton = screen.getByTitle('Delete color')
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(!('dummy' in JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!)))
    })
  })
})
