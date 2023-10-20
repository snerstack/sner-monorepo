import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import NumberField from '@/components/fields/NumberField'

describe('NumberField', () => {
  const name = 'test-number-field'
  const label = 'Test Number Field'
  const placeholder = 'Enter a number'
  const minValue = 1
  const description = 'This is a test number field'
  const required = true

  it('renders label and description', () => {
    const value = 5
    const setValue = vi.fn()
    const { getByLabelText, getByPlaceholderText, getByDisplayValue } = render(
      <NumberField
        name={name}
        label={label}
        placeholder={placeholder}
        minValue={minValue}
        description={description}
        required={required}
        _state={value}
        _setState={setValue}
      />,
    )

    expect(getByLabelText(label)).toBeInTheDocument()
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument()
    expect(getByDisplayValue(value.toString())).toBeInTheDocument()
  })

  it('renders vertically', () => {
    const value = 5
    const setValue = vi.fn()
    const { getByLabelText, getByPlaceholderText, getByDisplayValue } = render(
      <NumberField
        horizontal={false}
        name={name}
        label={label}
        placeholder={placeholder}
        minValue={minValue}
        description={description}
        required={required}
        _state={value}
        _setState={setValue}
      />,
    )

    expect(getByLabelText(label)).toBeInTheDocument()
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument()
    expect(getByDisplayValue(value.toString())).toBeInTheDocument()
  })

  it('renders error message', () => {
    const value = 0
    const setValue = vi.fn()
    const errors = ['This field is required']
    const { getByText } = render(
      <NumberField
        name={name}
        label={label}
        placeholder={placeholder}
        minValue={minValue}
        description={description}
        required={required}
        _state={value}
        _setState={setValue}
        errors={errors}
      />,
    )

    expect(getByText(description)).toBeInTheDocument()
    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('calls setValue on input change', () => {
    const value = 5
    const setValue = vi.fn()
    const { getByDisplayValue } = render(
      <NumberField
        name={name}
        label={label}
        placeholder={placeholder}
        minValue={minValue}
        description={description}
        required={required}
        _state={value}
        _setState={setValue}
      />,
    )

    const newValue = 10
    const input = getByDisplayValue(value.toString())
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: newValue.toString() } })
    expect(setValue).toHaveBeenCalledWith(newValue)
  })
})
