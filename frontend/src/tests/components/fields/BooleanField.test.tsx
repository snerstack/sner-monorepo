import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import BooleanField from '@/components/fields/BooleanField'

describe('BooleanField', () => {
  const name = 'test-checkbox'
  const label = 'Test Checkbox'
  const description = 'This is a test checkbox'
  const errors = ['Error message']

  it('renders label and description', () => {
    const { getByLabelText, getByText } = render(
      <BooleanField name={name} label={label} description={description} _state={false} _setState={() => {}} />,
    )

    expect(getByLabelText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()
  })

  it('renders vertically', () => {
    const { getByLabelText, getByText } = render(
      <BooleanField
        horizontal={false}
        name={name}
        label={label}
        description={description}
        _state={false}
        _setState={() => {}}
      />,
    )

    expect(getByLabelText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()
  })

  it('renders required', () => {
    const { getByLabelText } = render(
      <BooleanField
        required={true}
        name={name}
        label={label}
        description={description}
        _state={false}
        _setState={() => {}}
      />,
    )

    expect(getByLabelText(label)).toBeRequired()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <BooleanField
        name={name}
        label={label}
        description={description}
        errors={errors}
        _state={false}
        _setState={() => {}}
      />,
    )

    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('changes state when the checkbox is clicked', () => {
    const setStateMock = vi.fn()
    const { getByLabelText } = render(
      <BooleanField name={name} label={label} description={description} _state={false} _setState={setStateMock} />,
    )

    fireEvent.click(getByLabelText(label))
    expect(setStateMock).toHaveBeenCalledWith(true)
  })
})
