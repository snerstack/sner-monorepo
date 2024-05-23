import ProtectedRoute from '@/routes/ProtectedRoute'
import LoginPage from '@/routes/auth/login'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../utils/renderWithProviders'

describe('ProtectedRoute page', () => {
  it('redirects to login page', () => {
    renderWithProviders({
      element: <ProtectedRoute requiredRole="user" />,
      path: '/',
      routes: [{ element: <LoginPage />, path: '/auth/login' }],
    })
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })
})
