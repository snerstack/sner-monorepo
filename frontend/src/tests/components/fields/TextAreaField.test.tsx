import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TextAreaField from '@/components/fields/TextAreaField'

describe('TextAreaField', () => {
  const name = 'test-textarea'
  const label = 'Test Textarea'
  const placeholder = 'Enter some text'
  const description = 'This is a test textarea'
  const errors = ['Error message']
  const rows = 5

  it('renders label and description', () => {
    const state = ''
    const setState = vi.fn()
    render(
      <TextAreaField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        rows={rows}
        _state={state}
        _setState={setState}
      />,
    )

    expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders vertically', () => {
    const state = ''
    const setState = vi.fn()
    render(
      <TextAreaField
        horizontal={false}
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        rows={rows}
        _state={state}
        _setState={setState}
      />,
    )

    expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders required', () => {
    const state = ''
    const setState = vi.fn()
    render(
      <TextAreaField
        required={true}
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        rows={rows}
        _state={state}
        _setState={setState}
      />,
    )

    expect(screen.getByLabelText(label)).toBeRequired()
  })

  it('renders errors', () => {
    const state = ''
    const setState = vi.fn()
    render(
      <TextAreaField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        rows={rows}
        _state={state}
        _setState={setState}
      />,
    )

    const errorText = errors.join(' ')
    expect(screen.getByText(errorText)).toBeInTheDocument()
  })

  it('calls setState on change', () => {
    const state = ''
    const setState = vi.fn()
    render(
      <TextAreaField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        errors={errors}
        rows={rows}
        _state={state}
        _setState={setState}
      />,
    )

    const textarea = screen.getByRole('textbox')
    const value = 'test value'
    fireEvent.change(textarea, { target: { value } })

    expect(setState).toHaveBeenCalledWith(value)
  })
})
