import clsx from 'clsx'
import { Fragment } from 'react'

const SubmitField = ({
  name = '',
  errors = [],
  horizontal = true,
  handler,
}: {
  name: string
  errors?: string[]
  horizontal?: boolean
  handler: () => void | Promise<void>
}) => {
  const HorizontalParent = horizontal ? 'div' : Fragment
  return (
    <div className={clsx('form-group', horizontal && 'row')}>
      <HorizontalParent className={clsx(horizontal && 'col-sm-10 offset-sm-2')}>
        <input
          className={clsx('btn btn-primary', errors && 'is-invalid')}
          type="submit"
          name="submit"
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
