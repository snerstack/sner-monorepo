import UserListPage from '@/routes/auth/user/list'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('User list page', () => {
  it('shows table of users', async () => {
    renderWithProviders({
      element: <UserListPage />,
      path: '/auth/user/list',
    })

    await waitFor(() => {
      expect(screen.getByText('test_admin')).toBeInTheDocument()
      expect(screen.getByText('test_user')).toBeInTheDocument()
      expect(screen.getByText('test_operator')).toBeInTheDocument()
      expect(screen.getAllByRole('row')[1].textContent).toContain('1')
      expect(screen.getAllByRole('row')[2].textContent).toContain('3')
      expect(screen.getAllByRole('row')[3].textContent).toContain('11')
    })
  })
})
