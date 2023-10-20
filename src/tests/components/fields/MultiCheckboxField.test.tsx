import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import MultiCheckboxField from '@/components/fields/MultiCheckboxField'

describe('MultiCheckboxField', () => {
  const name = 'test-multicheckbox'
  const label = 'Test MultiCheckbox'
  const description = 'This is a test multicheckbox'
  const errors = ['Error message']
  const options = [
    { name: 'Option 1', checked: false },
    { name: 'Option 2', checked: true },
    { name: 'Option 3', checked: false },
  ]

  it('renders the label, description and options', () => {
    const { getByLabelText, getByText } = render(
      <MultiCheckboxField name={name} label={label} description={description} _state={options} _setState={() => {}} />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()
    expect(getByLabelText('Option 1')).not.toBeChecked()
    expect(getByLabelText('Option 2')).toBeChecked()
    expect(getByLabelText('Option 3')).not.toBeChecked()
  })

  it('renders vertically', () => {
    const { getByLabelText, getByText } = render(
      <MultiCheckboxField
        horizontal={false}
        name={name}
        label={label}
        description={description}
        _state={options}
        _setState={() => {}}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()
    expect(getByLabelText('Option 1')).not.toBeChecked()
    expect(getByLabelText('Option 2')).toBeChecked()
    expect(getByLabelText('Option 3')).not.toBeChecked()
  })

  it('renders required', () => {
    const { getByLabelText } = render(
      <MultiCheckboxField
        required={true}
        name={name}
        label={label}
        description={description}
        _state={options}
        _setState={() => {}}
      />,
    )

    expect(getByLabelText('Option 1')).toBeRequired()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <MultiCheckboxField
        name={name}
        label={label}
        description={description}
        errors={errors}
        _state={options}
        _setState={() => {}}
      />,
    )

    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('changes state when an option is checked', () => {
    const setStateMock = vi.fn()
    const { getByLabelText } = render(
      <MultiCheckboxField name={name} label={label} _state={options} _setState={setStateMock} />,
    )

    fireEvent.click(getByLabelText('Option 1'))

    expect(setStateMock).toHaveBeenCalledWith([
      { name: 'Option 1', checked: true },
      { name: 'Option 2', checked: true },
      { name: 'Option 3', checked: false },
    ])
  })
})
