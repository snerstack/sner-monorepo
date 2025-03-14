import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

export const testDeleteRow = ({ buttonId, confirm = true }: { buttonId: string; confirm?: boolean }) => {
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(confirm))
  vi.spyOn(httpClient, 'post').mockResolvedValue('')

  // selects first row
  const cells = screen.getAllByRole('cell')
  fireEvent.click(cells[0])

  const deleteRowButton = screen.getByTestId(buttonId)

  fireEvent.click(deleteRowButton)
}
