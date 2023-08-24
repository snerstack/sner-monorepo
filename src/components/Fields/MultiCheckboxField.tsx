import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction } from 'react'

const MultiCheckboxField = ({
  name = '',
  label = '',
  description = '',
  errors = [],
  required = false,
  horizontal = false,
  _state,
  _setState,
}: {
  name: string
  label: string
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: { name: string; checked: boolean }[]
  _setState: Dispatch<SetStateAction<{ name: string; checked: boolean }[]>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const updatedOptions = [..._state]
    updatedOptions[index].checked = checked
    _setState(updatedOptions)
  }

  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent className={clsx(horizontal && 'col-sm-10')}>
        <ul className="multiple_checkbox_field">
          {_state.map((option, index) => (
            <li>
              <input
                type="checkbox"
                name={option.name}
                required={required}
                checked={option.checked}
                onChange={(e) => handleCheckboxChange(index, e.target.checked)}
              />{' '}
              <label htmlFor={option.name}>{option.name}</label>
            </li>
          ))}
        </ul>
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
export default MultiCheckboxField
