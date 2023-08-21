import clsx from 'clsx'
import { Fragment, Dispatch, SetStateAction } from 'react'

const TextAreaField = ({
  name = '',
  label = '',
  placeholder = '',
  rows = 5,
  description = '',
  errors = [],
  required = false,
  horizontal = false,
  _state,
  _setState,
}: {
  name: string
  label: string
  placeholder: string
  rows?: number
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: string
  _setState: Dispatch<SetStateAction<string>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent className={clsx(horizontal && 'col-sm-10')}>
        <textarea
          className={clsx('form-control', errors.length > 0 && 'is-invalid')}
          name={name}
          placeholder={placeholder}
          required={required}
          rows={rows}
          value={_state}
          onChange={(e) => _setState(e.target.value)}
        />
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
export default TextAreaField
