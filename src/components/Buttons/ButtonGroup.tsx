import { Fragment, ReactElement } from 'react'

const ButtonGroup = ({ children }: { children: ReactElement[] }) => {
  return (
    <div className="btn-group btn-group-sm">
      <>
        {children.map((child, index) => (
          <Fragment key={index}>{child}</Fragment>
        ))}
      </>
    </div>
  )
}
export default ButtonGroup
