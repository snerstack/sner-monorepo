import QuickJump from './QuickJump'
import clsx from 'clsx'
import { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'
import { toolboxesVisible, viaTargetVisible } from '@/lib/sner/storage'

const Nav = () => {
  const [currentUser, setCurrentUser] = useRecoilState(userState)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const currentSubnav: string = pathname.split('/')[1]

type SubnavItem = { title: string; link: string }

  type NavMenuConfig = {
    [key: string]: { title: string; icon: string; link: string; acl: string; subnav: SubnavItem[] }
  }

  const navMenu: NavMenuConfig = {
    lens: {
      title: 'Lens',
      icon: 'fas fa-street-view',
      link: '/lens',
      acl: 'user',
      subnav: [
        { title: 'Hosts', link: '/lens/host/list' },
        { title: 'Services', link: '/lens/service/list' },
        { title: 'Vulnerabilities', link: '/lens/vuln/list' },
      ],
    },
    swagger: {
      title: 'API',
      icon: 'fas fa-paper-plane',
      link: '/swagger',
      acl: 'user',
      subnav: [],
    },
    scheduler: {
      title: 'Scheduler',
      icon: 'fas fa-tasks',
      link: '/scheduler/queue/list',
      acl: 'operator',
      subnav: [
        { title: 'Queues', link: '/scheduler/queue/list' },
        { title: 'Jobs', link: '/scheduler/job/list' },
      ],
    },
    storage: {
      title: 'Storage',
      icon: 'fas fa-database',
      link: '/storage/host/list',
      acl: 'operator',
      subnav: [
        { title: 'Hosts', link: '/storage/host/list' },
        { title: 'Services', link: '/storage/service/list' },
        { title: 'Services grouped', link: '/storage/service/grouped?crop=3' },
        { title: 'Vulns', link: '/storage/vuln/list' },
        { title: 'Vulns grouped', link: '/storage/vuln/grouped' },
        { title: 'Notes', link: '/storage/note/list' },
        { title: 'Notes grouped', link: '/storage/note/grouped' },
        { title: 'Versioninfos', link: '/storage/versioninfo/list' },
        { title: 'Vulnsearch', link: '/storage/vulnsearch/list' },
      ],
    },
    visuals: {
      title: 'Visuals',
      icon: 'fas fa-image',
      link: '/visuals/internals',
      acl: 'operator',
      subnav: [
        { title: 'Internals', link: '/visuals/internals' },
        { title: 'DNS Tree', link: '/visuals/dnstree?crop=1' },
        { title: 'Portmap', link: '/visuals/portmap' },
        { title: 'Port infos', link: '/visuals/portinfos?crop=3&limit=50' },
      ],
    },
  }

  const UserNavbar = () => {
    return (
      <ul className="navbar-nav mr-auto">
        {Object.entries(navMenu).map(
          ([name, item]) =>
            currentUser.roles.includes(item.acl) && (
              <li key={name} className="nav-item">
                <Link
                  className={clsx('nav-link', currentSubnav === name && 'active')}
                  to={item.link}
                  title={item.title}
                >
                  <i className={item.icon}></i>
                </Link>
              </li>
            ),
        )}

        {navMenu[currentSubnav] &&
          currentUser.roles.includes(navMenu[currentSubnav].acl) &&
          navMenu[currentSubnav].subnav.map((item: SubnavItem) => (
            <li key={item.title} className="nav-item">
              <Link className={clsx('nav-link', pathname.startsWith(item.link) && 'active')} to={item.link}>
                {item.title}
              </Link>
            </li>
          ))}
      </ul>
    )
  }

  const logoutHandler = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    //TODO: must be post
    httpClient
      .get(urlFor('/backend/auth/logout'))
      .then(() => {
        setCurrentUser({ id: 0, username: '', email: '', roles: [], isAuthenticated: false })
        navigate('/')
      })
      .catch((e) => {
        /* c8 ignore next 3 */
        console.error(e)
        toast.error('Error while logging out.')
      })
  }

  const toggleViaTargetHandler = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    sessionStorage.setItem(
      'dt_viatarget_column_visible',
      sessionStorage.getItem('dt_viatarget_column_visible') === 'true' ? 'false' : 'true',
    )
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('DataTables_'))
      .forEach((key) => sessionStorage.removeItem(key))
    navigate(0)
  }

  const toggleToolboxesHandler = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    sessionStorage.setItem(
      'dt_toolboxes_visible',
      sessionStorage.getItem('dt_toolboxes_visible') === 'true' ? 'false' : 'true',
    )
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('DataTables_'))
      .forEach((key) => sessionStorage.removeItem(key))
    navigate(0)
  }

  const UserMenu = () => {
    return (
      <ul className="navbar-nav">
        <li className="nav-item dropdown">
          <a className="nav-link dropdown-toggle" href="#" id="dropdownUser" data-toggle="dropdown">
            {
              /* c8 ignore next */
              currentUser.username.length > 15 ? `${currentUser.username.substring(0, 12)}...` : currentUser.username
            }
          </a>
          <div className="dropdown-menu dropdown-menu-right">
            {currentUser.roles.includes('admin') && (
              <Link className="dropdown-item" to="/auth/user/list">
                Manage users
              </Link>
            )}
            <a className="dropdown-item" href="#" onClick={toggleViaTargetHandler}>
              {`Toggle via_target (${viaTargetVisible()})`}
            </a>
            <a className="dropdown-item" href="#" onClick={toggleToolboxesHandler}>
              {`Toggle DT toolboxes (${toolboxesVisible()})`}
            </a>
            {currentUser.roles.includes('user') && (
              <Link className="dropdown-item" to="/auth/profile">
                Profile
              </Link>
            )}
            <Link className="dropdown-item" to="/storage/host/lookup">
              Host lookup
            </Link>
            <a className="dropdown-item" href="#" onClick={logoutHandler}>
              Logout
            </a>
          </div>
        </li>
      </ul>
    )
  }

  const LoggedinNavbar = () => {
    return (
      <>
        <UserNavbar />
        {currentUser.roles.includes('operator') && <QuickJump />}
        <UserMenu />
      </>
    )
  }

  const LoginNavbar = () => {
    return (
      <ul className="navbar-nav">
        <li className="nav-item">
          <Link className="nav-link" to="/auth/login">
            Login
          </Link>
        </li>
      </ul>
    )
  }

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark fixed-top py-0">
      <Link className="navbar-brand" to="/">
        <img src="/logo.png" />
      </Link>
      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#mainNavbar">
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="mainNavbar">
        {currentUser.isAuthenticated ? <LoggedinNavbar /> : <LoginNavbar />}
      </div>
    </nav>
  )
}
export default Nav
