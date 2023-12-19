import { fireEvent, screen } from '@testing-library/react'

export const testFilter = ({ query }: { query: string }) => {
  const filterForm = screen.getByTestId('filter-form')
  const filterInput = filterForm.querySelector('input')!
  const filterButton = screen.getByTestId('filter-btn')

  fireEvent.change(filterInput, { target: { value: query } })
  fireEvent.click(filterButton)
}
