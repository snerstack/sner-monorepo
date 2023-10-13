import { capitalize } from '@/utils'
import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction } from 'react'
import { TagsInput } from 'react-tag-input-component'

const TagsField = ({
  name = '',
  label = '',
  placeholder = '',
  defaultTags = [],
  description = '',
  errors = [],
  required = false,
  horizontal = true,
  _state,
  _setState,
}: {
  name: string
  label: string
  placeholder: string
  defaultTags?: string[]
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: string[]
  _setState: Dispatch<SetStateAction<string[]>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent {...(horizontal ? { className: 'col-sm-10' } : {})}>
        <TagsInput value={_state} onChange={_setState} name={name} placeHolder={placeholder} />
        {defaultTags.length > 0 && (
          <div className="mt-3">
            {defaultTags.map((tag) => (
              <Fragment key={tag}>
                <a
                  className="btn btn-outline-secondary btn-sm mb-1"
                  onClick={() => {
                    if (_state.indexOf(tag) == -1) {
                      _setState([..._state, tag])
                    }
                  }}
                >
                  {capitalize(tag)}
                </a>{' '}
              </Fragment>
            ))}
          </div>
        )}
        {description && (
          <small className="form-text text-muted">
            <small>{description}</small>
          </small>
        )}
        {errors.length > 0 && (
          <div className="invalid-feedback">
            <small>{errors.join(' ')}</small>
          </div>
        )}
      </HorizontalParent>
    </div>
  )
}
export default TagsField
