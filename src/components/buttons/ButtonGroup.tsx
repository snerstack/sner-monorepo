import { Fragment, ReactElement } from 'react'

const ButtonGroup = ({ children }: { children: ReactElement | ReactElement[] }) => {
  return (
    <div className="btn-group btn-group-sm">
      <>
        {Array.isArray(children) ? children.map((child, index) => <Fragment key={index}>{child}</Fragment>) : children}
      </>
    </div>
  )
}
export default ButtonGroup
