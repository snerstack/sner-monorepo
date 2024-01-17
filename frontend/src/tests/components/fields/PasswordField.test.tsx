import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PasswordField from '@/components/fields/PasswordField'

describe('PasswordField', () => {
  const name = 'test-passwordfield'
  const label = 'Test PasswordField'
  const placeholder = 'Enter password'
  const description = 'This is a test passwordfield'
  const errors = ['Error message']

  it('renders the label and description', () => {
    const state = ''
    const setState = vi.fn()
    const { getByText, getByPlaceholderText } = render(
      <PasswordField
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
      <PasswordField
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
      <PasswordField
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
      <PasswordField
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
      <PasswordField
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
