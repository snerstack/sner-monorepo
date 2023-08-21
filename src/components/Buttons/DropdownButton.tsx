const DropdownButton = ({ title, options }: { title: string; options: { name: string; data: string }[] }) => {
  return (
    <div className="btn-group btn-group-sm dropdown dropleft">
      <a className="btn btn-outline-secondary font-weight-bold" data-toggle="dropdown" href="#" title="Show more data">
        <i className="fa fa-binoculars"></i>
      </a>
      <div className="dropdown-menu">
        <h6 className="dropdown-header">{title}</h6>
        {options.map((option) => (
          <a className="dropdown-item disabled" key={option.name}>
            {option.name}: {option.data}
          </a>
        ))}
      </div>
    </div>
  )
}
export default DropdownButton
