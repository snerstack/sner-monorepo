import clsx from 'clsx'
import { ReactElement, useState } from 'react'

const CollapseMenu = ({ label, children }: { label: string; children: ReactElement }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="w-100">
      <div className="btn d-flex justify-content-between" onClick={handleToggle}>
        <label className="font-weight-bolder" role="button">
          {label}
        </label>
        <i className={clsx('fas d-flex align-items-center', isOpen ? 'fa-chevron-down' : 'fa-chevron-up')}></i>
      </div>
      {isOpen && <>{children}</>}
    </div>
  )
}

export default CollapseMenu
