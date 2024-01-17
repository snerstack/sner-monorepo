import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TextField from '@/components/fields/TextField'

describe('TextField', () => {
  const name = 'test-field'
  const label = 'Test Field'
  const placeholder = 'Enter some text'
  const description = 'This is a test field'
  const errors = ['Error message']

  it('renders the label and description', () => {
    const state = ''
    const setState = vi.fn()
    const { getByText, getByPlaceholderText } = render(
      <TextField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        _state={state}
        _setState={setState}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()

    const input = getByPlaceholderText(placeholder)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(state)
  })

  it('renders vertically', () => {
    const state = ''
    const setState = vi.fn()
    const { getByText, getByPlaceholderText } = render(
      <TextField
        horizontal={false}
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        _state={state}
        _setState={setState}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()

    const input = getByPlaceholderText(placeholder)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(state)
  })

  it('renders the required state', () => {
    const state = ''
    const setState = vi.fn()
    const { getByLabelText } = render(
      <TextField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        required
        _state={state}
        _setState={setState}
      />,
    )

    expect(getByLabelText(label)).toBeRequired()
  })

  it('renders the errors', () => {
    const state = ''
    const setState = vi.fn()
    const { getByText } = render(
      <TextField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        _state={state}
        _setState={setState}
      />,
    )

    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('calls the setState function on input change', () => {
    const state = ''
    const setState = vi.fn()
    const { getByPlaceholderText } = render(
      <TextField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        _state={state}
        _setState={setState}
      />,
    )

    const input = getByPlaceholderText(placeholder)
    const newValue = 'new value'
    fireEvent.change(input, { target: { value: newValue } })
    expect(setState).toHaveBeenCalledWith(newValue)
  })
})
