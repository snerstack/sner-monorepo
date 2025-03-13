import { ReactElement } from 'react'

const ButtonGroup = ({ children }: { children: ReactElement | ReactElement[] }) => {
  return (
    <div className="btn-group btn-group-sm">{children}</div>
  )
}
export default ButtonGroup
