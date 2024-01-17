import { fireEvent, screen } from '@testing-library/react'

export const testSelectAllRows = ({ buttonId }: { buttonId: string }) => {
  const selectAllButton = screen.getByTestId(buttonId)

  fireEvent.click(selectAllButton)
}
