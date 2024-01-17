import { capitalize } from '@/utils'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TagsField from '@/components/fields/TagsField'

describe('TagsField', () => {
  const name = 'tags'
  const label = 'Tags'
  const placeholder = 'Add tags'
  const defaultTags = ['tag1', 'tag2']
  const description = 'Add tags that describe the content'
  const errors = ['Invalid tag']

  it('renders label, description and default tags', () => {
    const { getByPlaceholderText, getByText } = render(
      <TagsField
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        defaultTags={defaultTags}
        _state={[]}
        _setState={() => {}}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument()

    defaultTags.forEach((tag) => {
      expect(getByText(capitalize(tag))).toBeInTheDocument()
    })
  })

  it('renders vertically', () => {
    const { getByPlaceholderText, getByText } = render(
      <TagsField
        horizontal={false}
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        defaultTags={defaultTags}
        _state={[]}
        _setState={() => {}}
      />,
    )

    expect(getByText(label)).toBeInTheDocument()
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument()

    defaultTags.forEach((tag) => {
      expect(getByText(capitalize(tag))).toBeInTheDocument()
    })
  })

  it('renders the required state', () => {
    render(
      <TagsField
        required={true}
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        defaultTags={defaultTags}
        _state={[]}
        _setState={() => {}}
      />,
    )

    const required = document.querySelector('.required')
    expect(required).toBeInTheDocument()
  })

  it('renders the component with errors', () => {
    const { getByText } = render(
      <TagsField
        name={name}
        label={label}
        placeholder={placeholder}
        errors={errors}
        _state={[]}
        _setState={() => {}}
      />,
    )

    expect(getByText(errors[0])).toBeInTheDocument()
  })

  it('calls the _setState function when a tag is added', () => {
    const mockSetState = vi.fn()
    const { getByPlaceholderText } = render(
      <TagsField name={name} label={label} placeholder={placeholder} _state={[]} _setState={mockSetState} />,
    )

    const input = getByPlaceholderText(placeholder)
    fireEvent.change(input, { target: { value: 'new tag' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(mockSetState).toHaveBeenCalledWith(['new tag'])
  })
})
