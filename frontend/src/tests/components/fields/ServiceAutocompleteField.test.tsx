import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ServiceAutocompleteField from '@/components/fields/ServiceAutocompleteField'

describe('ServiceAutocompleteField', () => {
  const name = 'service_id'
  const label = 'Service ID'
  const description = 'This is a test service ID'

  it('renders vertically', () => {
    const { getByLabelText, getByText } = render(
      <ServiceAutocompleteField
        hostId={1}
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
      <ServiceAutocompleteField
        hostId={1}
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
      <ServiceAutocompleteField
        hostId={1}
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
