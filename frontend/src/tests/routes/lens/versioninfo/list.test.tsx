import LensVersioninfoListPage from '@/routes/lens/versioninfo/list'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

describe('Lens versioninfo list page', () => {
  it('shows table of versioninfo', async () => {
    renderWithProviders({
      element: <LensVersioninfoListPage />,
      path: '/lens/versioninfo/list',
    })

    await waitFor(() => {
      expect(screen.getByTestId('heading')).toHaveTextContent('Versioninfo')

      expect(screen.getByText('dummy product')).toBeInTheDocument()
      expect(screen.getByText('1.2.3')).toBeInTheDocument()
      expect(screen.getByText('dummy product 2')).toBeInTheDocument()
      expect(screen.getByText('4.5.6')).toBeInTheDocument()
    })
  })

  it('queries by product and version', async () => {
    renderWithProviders({ element: <LensVersioninfoListPage />, path: '/lens/versioninfo/list' })

    const productInput = screen.getByLabelText('Product')
    const versionInput = screen.getByLabelText('Versionspec')
    const submitButton = screen.getByRole('button', { name: 'Query' })
    fireEvent.change(productInput, { target: { value: 'product dummy 2' } })
    fireEvent.change(versionInput, { target: { value: '>=2.0.0' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('dummy product 2')).toBeInTheDocument()
      expect(screen.getByText('4.5.6')).toBeInTheDocument()
    })
  })
})
