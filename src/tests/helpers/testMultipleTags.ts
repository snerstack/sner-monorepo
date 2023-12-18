import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect, vi } from 'vitest'

import httpClient from '@/lib/httpClient'

export const testMultipleTags = async ({ action, testId }: { action: 'set' | 'unset'; testId: string }) => {
  await waitFor(() => {
    // selects first row
    const cells = screen.getAllByRole('cell')
    fireEvent.click(cells[0])
  })

  vi.spyOn(httpClient, 'post').mockResolvedValue('')

  const tagMultipleButton = screen.getByTestId(testId)

  fireEvent.click(tagMultipleButton)

  await waitFor(() => {
    if (action === 'set') {
      expect(screen.getByText('Tag multiple items')).toBeInTheDocument()
      const tagsInput = screen.getByTestId('tags-field').querySelector('input')!
      fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
      fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    } else {
      expect(screen.getByText('Untag multiple items')).toBeInTheDocument()
      const tagsInput = screen.getByTestId('tags-field').querySelector('input')!
      fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
      fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })

      // closes modal without saving
      const modalBackground = screen.getByTestId('multiple-tag-modal').parentElement!
      fireEvent.click(modalBackground)
    }
  })
}
