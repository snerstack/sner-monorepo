import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction } from 'react'

const BooleanField = ({
  name = '',
  label = '',
  description = '',
  errors = [],
  required = false,
  horizontal = true,
  _state,
  _setState,
}: {
  name: string
  label: string
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: boolean
  _setState: Dispatch<SetStateAction<boolean>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <HorizontalParent className={clsx(horizontal && 'col-sm-10 offset-sm-2')}>
        <div className={clsx('form-check', errors.length > 0 && 'is-invalid')}>
          <input
            className={clsx('form-check-input', errors.length > 0 && 'is-invalid')}
            type="checkbox"
            name={name}
            id={name}
            required={required}
            checked={_state}
            onChange={(e) => _setState(e.target.checked)}
          />
          <label className="form-check-label" htmlFor={name}>
            {label}
          </label>
        </div>
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
export default BooleanField
