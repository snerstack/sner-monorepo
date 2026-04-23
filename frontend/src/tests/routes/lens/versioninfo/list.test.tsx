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

  it('queries by product and version using RBQFilter', async () => {
    renderWithProviders({ element: <LensVersioninfoListPage />, path: '/lens/versioninfo/list' })

    const addRuleButtons = screen.getAllByText('+ Rule')
    fireEvent.click(addRuleButtons[0])

    const fieldSelects = document.querySelectorAll('.rule-fields')
    fireEvent.change(fieldSelects[0], { target: { value: 'Versioninfo.product' } })

    const operatorSelects = document.querySelectorAll('.rule-operators')
    fireEvent.change(operatorSelects[0], { target: { value: '==' } })

    const valueInputs = screen.getAllByRole('textbox')
    fireEvent.change(valueInputs[0], { target: { value: 'product dummy 2' } })

    fireEvent.click(addRuleButtons[0])

    const fieldSelectsUpdated = document.querySelectorAll('.rule-fields')
    fireEvent.change(fieldSelectsUpdated[1], { target: { value: 'Versioninfo.version' } })

    const operatorSelectsUpdated = document.querySelectorAll('.rule-operators')
    fireEvent.change(operatorSelectsUpdated[1], { target: { value: '>=' } })

    const valueInputsUpdated = screen.getAllByRole('textbox')
    fireEvent.change(valueInputsUpdated[1], { target: { value: '2.0.0' } })

    const filterBtn = screen.getByText('Filter')
    fireEvent.click(filterBtn)

    await waitFor(() => {
      expect(screen.queryByText('dummy product')).not.toBeInTheDocument()
      expect(screen.queryByText('1.2.3')).not.toBeInTheDocument()
      expect(screen.getByText('dummy product 2')).toBeInTheDocument()
      expect(screen.getByText('4.5.6')).toBeInTheDocument()
    })
  })
})
