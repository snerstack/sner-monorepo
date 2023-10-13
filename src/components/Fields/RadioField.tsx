import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction } from 'react'

const RadioField = ({
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
  _state: { options: string[]; selected: string }
  _setState: Dispatch<SetStateAction<{ options: string[]; selected: string }>>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent {...(horizontal ? { className: 'col-sm-10' } : {})}>
        <ul className="form-control border-0 mb-0">
          {_state.options.map((option, index) => (
            <li className="form-check form-check-inline" key={index}>
              <input
                className="form-check-input"
                type="radio"
                name={name}
                value={option}
                id={`${name}-${index}`}
                checked={option === _state.selected}
                onChange={() => _setState({ ..._state, selected: option })}
              />
              <label htmlFor={`${name}-${index}`} className="form-check-label">
                {option}
              </label>
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
  // <div class='{{form_group_classes}}'>
  // 	{{label_output}}
  // 	<div {{'class=col-sm-10' if horizontal}}>
  // 		<ul class='form-control border-0 mb-0'>
  // 			{% for option in field %}
  // 				<li class='form-check form-check-inline'>
  // 					{{option(class_='form-check-input')}}
  // 					{{option.label(class_='form-check-label')}}
  // 				</li>
  // 			{% endfor %}
  // 		</ul>
  // 	</div>
  // </div>
}
export default RadioField
