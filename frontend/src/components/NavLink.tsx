import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'

const NavLink = ({ title, url }: { title: string; url: string }) => {
  const { pathname } = useLocation()

  return (
    <li className={clsx('nav-item', pathname.startsWith(url) && 'active')}>
      <Link className="nav-link" to={url}>
        {title}
      </Link>
    </li>
  )
}
export default NavLink
