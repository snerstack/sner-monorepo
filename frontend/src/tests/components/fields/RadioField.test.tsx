import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RadioField from '@/components/fields/RadioField'

describe('RadioField', () => {
  const name = 'test-radio'
  const label = 'Test Radio'
  const description = 'This is a test radio'
  const errors = ['Error message']
  const state = {
    options: ['option1', 'option2', 'option3'],
    selected: 'option1',
  }

  it('renders label and description', () => {
    const { getByLabelText, getByText } = render(
      <RadioField name={name} label={label} description={description} _state={state} _setState={() => {}} />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()

    state.options.forEach((option) => {
      const radio = getByLabelText(option)
      expect(radio).toBeInTheDocument()
    })
  })

  it('renders vertically', () => {
    const { getByLabelText, getByText } = render(
      <RadioField
        horizontal={false}
        name={name}
        label={label}
        description={description}
        _state={state}
        _setState={() => {}}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()

    state.options.forEach((option) => {
      const radio = getByLabelText(option)
      expect(radio).toBeInTheDocument()
    })
  })

  it('renders required', () => {
    render(
      <RadioField
        required={true}
        name={name}
        label={label}
        description={description}
        _state={state}
        _setState={() => {}}
      />,
    )

    const required = document.querySelector('.required')
    expect(required).toBeInTheDocument()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <RadioField
        name={name}
        label={label}
        description={description}
        errors={errors}
        _state={state}
        _setState={() => {}}
      />,
    )

    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('calls setState when an option is selected', () => {
    const setStateMock = vi.fn()
    const { getByLabelText } = render(<RadioField name={name} label={label} _state={state} _setState={setStateMock} />)

    const radio = getByLabelText('option2')
    fireEvent.click(radio)

    expect(setStateMock).toHaveBeenCalledTimes(1)
    expect(setStateMock).toHaveBeenCalledWith({ options: ['option1', 'option2', 'option3'], selected: 'option2' })
  })
})
