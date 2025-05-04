import clsx from 'clsx'
import { Fragment } from 'react'

const SubmitField = ({
  name = '',
  errors = [],
  horizontal = true,
  className = '',
  handler,
}: {
  name: string
  errors?: string[]
  horizontal?: boolean
  className?: string
  handler: () => void | Promise<void> | Promise<unknown>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row')}>
      <HorizontalParent {...(horizontal ? { className: 'col-sm-10 offset-sm-2' } : {})}>
        <input
          className={clsx('btn btn-primary', className, errors && 'is-invalid')}
          type="submit"
          name="submit"
          id={name}
          value={name}
          onClick={(e) => {
            e.preventDefault()
            void handler()
          }}
        />
        {errors && (
          <div className="invalid-feedback">
            <small>{errors.join(' ')}</small>
          </div>
        )}
      </HorizontalParent>
    </div>
  )
}
export default SubmitField
