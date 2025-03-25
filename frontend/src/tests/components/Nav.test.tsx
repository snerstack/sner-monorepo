import { fireEvent, screen, waitFor } from '@testing-library/react'
import * as recoil from 'recoil'
import { describe, expect, it, vi } from 'vitest'

import { toolboxesVisible, viaTargetVisible } from '@/lib/sner/storage'
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

  it('test toggle via_target', async () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })

    await waitFor(() => {
      fireEvent.click(screen.getByText('UI: toggle via_target (false)'))
      expect(viaTargetVisible()).toBeTruthy()
    })

    await waitFor(() => {
      fireEvent.click(screen.getByText('UI: toggle via_target (true)'))
      expect(viaTargetVisible()).toBeFalsy()
    })
  })

  it('test toggle dt toolboxes', async () => {
    mockLoggedinUserState()

    renderWithProviders({ element: <Nav />, path: '/' })

    await waitFor(() => {
      fireEvent.click(screen.getByText('UI: toggle DT toolboxes (false)'))
      expect(toolboxesVisible()).toBeTruthy()
    })

    await waitFor(() => {
      fireEvent.click(screen.getByText('UI: toggle DT toolboxes (true)'))
      expect(toolboxesVisible()).toBeFalsy()
    })
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
