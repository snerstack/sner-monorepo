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

  it('test toggle via_target', () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })
    fireEvent.click(screen.getByText('Toggle via_target (null)'))
    expect(sessionStorage.getItem('dt_viatarget_column_visible')).toBeTruthy()

    fireEvent.click(screen.getByText('Toggle via_target (true)'))
    expect(sessionStorage.getItem('dt_viatarget_column_visible')).toBe('false')
  })

  it('test toggle dt toolboxes', () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })
    fireEvent.click(screen.getByText('Toggle DT toolboxes (null)'))
    expect(sessionStorage.getItem('dt_toolboxes_visible')).toBeTruthy()

    fireEvent.click(screen.getByText('Toggle DT toolboxes (true)'))
    expect(sessionStorage.getItem('dt_toolboxes_visible')).toBe('false')
  })

  it('test logout button', async () => {
    const [_, mockSetState] = mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })
    fireEvent.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(mockSetState).toBeCalled()
    })
  })
})
