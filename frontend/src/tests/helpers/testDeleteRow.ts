import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

import httpClient from '@/lib/httpClient'

export const testDeleteRow = ({ buttonId, confirm = true }: { buttonId: string; confirm?: boolean }) => {
  vi.spyOn(httpClient, 'post').mockResolvedValue('')

  // selects first row
  const cells = screen.getAllByRole('cell')
  fireEvent.click(cells[0])

  window.confirm = vi.fn().mockReturnValue(confirm)

  const deleteRowButton = screen.getByTestId(buttonId)

  fireEvent.click(deleteRowButton)
}
