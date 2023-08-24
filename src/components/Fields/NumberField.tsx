import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction } from 'react'

const NumberField = ({
  name = '',
  label = '',
  placeholder = '',
  minValue = 1,
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
  minValue?: number
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: number
  _setState: Dispatch<SetStateAction<number>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent className={clsx(horizontal && 'col-sm-10')}>
        <input
          className={clsx('form-control', errors.length > 0 && 'is-invalid')}
          type="number"
          placeholder={placeholder}
          name={name}
          required={required}
          value={_state}
          onChange={(e) => _setState(e.target.valueAsNumber)}
          min={minValue}
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
export default NumberField
