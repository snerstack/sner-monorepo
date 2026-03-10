import { fireEvent, screen, waitFor } from '@testing-library/react'
import * as recoil from 'recoil'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

import Nav from '@/components/Nav'

const mockLoggedinUserState = () => {
  const mockState = { id: 0, username: 'dummy', email: 'dummy', roles: ['user', 'operator'], isAuthenticated: true }
  const mockSetState: recoil.SetterOrUpdater<unknown> = vi.fn()
  type RecoilStateReturn = [unknown, recoil.SetterOrUpdater<unknown>]
  vi.spyOn(recoil, 'useRecoilState').mockImplementation((): RecoilStateReturn => [mockState, mockSetState])

  return [mockState, mockSetState]
}

describe('Nav component', () => {
  it('provides logged-in user navbar', () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/scheduler/queue/list' })
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('provides logged-out user navbar', () => {
    renderWithProviders({ element: <Nav />, path: '/' })
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('test copy username', async () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })

    const clipboardMock = vi.fn()
    vi.stubGlobal("navigator", { clipboard: { writeText: clipboardMock } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Copy username'))
      expect(clipboardMock).toHaveBeenCalledWith("dummy")
    })
  })

  it('test logout button', async () => {
    const [, mockSetState] = mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })
    fireEvent.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(mockSetState).toBeCalled()
    })
  })
})
