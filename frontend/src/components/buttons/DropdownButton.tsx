import clsx from 'clsx'

const DropdownButton = ({
  title,
  options,
  small = true,
}: {
  title: string
  options: { name: string; data: string }[]
  small?: boolean
}) => {
  return (
    <div className={clsx('btn-group dropdown dropleft', small && 'btn-group-sm')}>
      <a
        className={clsx('btn font-weight-bold', small ? 'btn-outline-secondary' : 'btn-outline-primary')}
        data-toggle="dropdown"
        href="#"
        title="Show more data"
      >
        <i className="fa fa-binoculars"></i>
      </a>
      <div className="dropdown-menu">
        <h6 className="dropdown-header">{title}</h6>
        {options.map((option) => (
          <a className="dropdown-item" key={option.name}>
            {option.name}: {option.data}
          </a>
        ))}
      </div>
    </div>
  )
}
export default DropdownButton
