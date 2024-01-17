import { fireEvent, screen } from '@testing-library/react'

export const testSelectNoneRows = ({ buttonId }: { buttonId: string }) => {
  const selectNoneButton = screen.getByTestId(buttonId)

  fireEvent.click(selectNoneButton)
}
