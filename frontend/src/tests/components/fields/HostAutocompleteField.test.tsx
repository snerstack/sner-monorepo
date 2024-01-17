import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HostAutocompleteField from '@/components/fields/HostAutocompleteField'

describe('HostAutocompleteField', () => {
  const name = 'host_id'
  const label = 'Host ID'
  const description = 'This is a test host ID'

  it('renders vertically', () => {
    const { getByLabelText, getByText } = render(
      <HostAutocompleteField
        name={name}
        label={label}
        placeholder=""
        horizontal={false}
        description={description}
        _state={0}
        _setState={() => {}}
      />,
    )

    expect(getByLabelText(label)).toBeInTheDocument()
    expect(getByText(description)).toBeInTheDocument()
  })

  it('renders required', () => {
    const { getByLabelText } = render(
      <HostAutocompleteField
        required={true}
        name={name}
        label={label}
        placeholder=""
        horizontal={false}
        description={description}
        _state={0}
        _setState={() => {}}
      />,
    )

    expect(getByLabelText(label)).toBeRequired()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <HostAutocompleteField
        name={name}
        label={label}
        placeholder=""
        horizontal={false}
        description={description}
        errors={['Error message']}
        _state={0}
        _setState={() => {}}
      />,
    )

    expect(getByText('Error message')).toBeInTheDocument()
  })
})
