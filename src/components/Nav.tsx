import NavLink from './NavLink'
import env from 'app-env'
import clsx from 'clsx'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSessionStorage } from 'react-use'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

const Nav = () => {
  const [currentUser, setCurrentUser] = useRecoilState(userState)
  const [toolboxesVisible, setToolboxesVisible] = useSessionStorage('dt_toolboxes_visible')
  const [viaTargetVisible, setViaTargetVisible] = useSessionStorage('dt_viatarget_column_visible')

  const { pathname } = useLocation()
  const navigate = useNavigate()

  const links = [
    { title: 'Scheduler', url: '/scheduler/queue/list', icon: 'fa-tasks' },
    { title: 'Storage', url: '/storage/host/list', icon: 'fa-database' },
    { title: 'Visuals', url: '/visuals', icon: 'fa-image' },
  ]

  const logoutHandler = async () => {
    try {
      await httpClient.get(env.VITE_SERVER_URL + '/auth/logout')

      setCurrentUser({ id: 0, username: '', email: '', roles: [], isAuthenticated: false })

      navigate('/')
    } catch (err) {
      toast.error('Error while logging out.')
    }
  }

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark fixed-top py-0">
      <Link className="navbar-brand" to="/">
        <img src="/logo.png" />
      </Link>
      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault">
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarsExampleDefault">
        <ul className="navbar-nav mr-auto">
          {currentUser.isAuthenticated && (
            <>
              {currentUser.roles.includes('user') && (
                <li className="nav-item">
                  <a className="nav-link" href="/api/doc/swagger" title="API">
                    <i className="fas fa-paper-plane"></i>
                  </a>
                </li>
              )}
              {currentUser.roles.includes('operator') && (
                <>
                  {links.map(({ title, url, icon }) => (
                    <li className="nav-item" key={title}>
                      <Link
                        className={clsx('nav-link', pathname.startsWith('/' + title.toLowerCase()) && 'active')}
                        to={url}
                        title={title}
                      >
                        <i className={`fas ${icon}`}></i>
                      </Link>
                    </li>
                  ))}
                </>
              )}
              {pathname.split('/')[1] === 'scheduler' && (
                <>
                  <NavLink title="Queues" url="/scheduler/queue/list" />
                  <NavLink title="Jobs" url="/scheduler/job/list" />
                </>
              )}
              {pathname.split('/')[1] === 'storage' && (
                <>
                  <NavLink title="Hosts" url="/storage/host/list" />
                  <NavLink title="Services" url="/storage/service/list" />
                  <NavLink title="Services grouped" url="/storage/service/grouped?crop=3" />
                  <NavLink title="Vulnerabilities" url="/storage/vuln/list" />
                  <NavLink title="Vulnerabilities grouped" url="/storage/vuln/grouped" />
                  <NavLink title="Notes" url="/storage/note/list" />
                </>
              )}
              {pathname.split('/')[1] === 'visuals' && (
                <>
                  <NavLink title="Internals" url="/visuals/internals" />
                  <NavLink title="DNS Tree" url="/visuals/dnstree?crop=1" />
                  <NavLink title="Portmap" url="/visuals/portmap" />
                  <NavLink title="Port infos" url="/visuals/portinfos?crop=3&limit=50" />
                </>
              )}
            </>
          )}
        </ul>

        {currentUser.isAuthenticated && currentUser.roles.includes('operator') && (
          <form id="storage_quickjump_form" className="form-inline" style={{ display: 'inline' }} method="post">
            <input
              className="form-control form-control-sm"
              type="text"
              name="quickjump"
              placeholder="Quick jump"
              title="Quick jump with address, hostname or port"
            />
          </form>
        )}
        <ul className="navbar-nav">
          {!currentUser.isAuthenticated ? (
            <li className="nav-item">
              <Link className="nav-link" to="/auth/login">
                Login
              </Link>
            </li>
          ) : (
            <li className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" id="dropdownUser" data-toggle="dropdown">
                {currentUser.username}
              </a>
              <div className="dropdown-menu dropdown-menu-right">
                {currentUser.roles.includes('admin') && (
                  <Link className="dropdown-item" to="/auth/user/list">
                    Manage users
                  </Link>
                )}
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => {
                    if (!confirm('Toggle will remove any datatable states and reaload the page. Are you sure?')) return

                    setViaTargetVisible(!viaTargetVisible)

                    window.location.reload()
                  }}
                >
                  Toggle via_target ({viaTargetVisible ? 'true' : 'false'})
                </a>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => {
                    if (!confirm('Toggle will remove any datatable states and reaload the page. Are you sure?')) return

                    setToolboxesVisible(!toolboxesVisible)

                    /* the saved states must be removed, the save state has precedence over dt initialization values */
                    Object.keys(sessionStorage)
                      .filter((key) => key.startsWith('DataTables_'))
                      .map((key) => sessionStorage.removeItem(key))

                    window.location.reload()
                  }}
                >
                  Toggle DT toolboxes ({toolboxesVisible ? 'true' : 'false'})
                </a>
                {currentUser.roles.includes('user') && (
                  <Link className="dropdown-item" to="/auth/profile">
                    Profile
                  </Link>
                )}
                <a className="dropdown-item" href="#" onClick={logoutHandler}>
                  Logout
                </a>
              </div>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}
export default Nav
