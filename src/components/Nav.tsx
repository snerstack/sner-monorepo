import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import NavLink from './NavLink'

const Nav = () => {
  const currentUser = {
    isAuthenticated: true,
    roles: ['user', 'operator', 'admin'],
    username: 'filip',
  }

  const { pathname } = useLocation()

  const links = [
    { title: 'Scheduler', url: '/scheduler/queue/list', icon: 'fa-tasks' },
    { title: 'Storage', url: '/storage/host/list', icon: 'fa-database' },
    { title: 'Visuals', url: '/visuals', icon: 'fa-image' },
  ]

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
                  <NavLink title="Port infos" url="/portinfos?crop=3&limit=50" />
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
          {/* {% if config['DEBUG'] %}
            <li><span className="nav-link text-warning">debug enabled</span></li>
          {% endif %} */}

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
                <a className="dropdown-item" href="#">
                  Toggle via_target (<span id="menu_dt_viatarget_column_visible_value"></span>)
                </a>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => {
                    if (!confirm('Toggle will remove any datatable states and reaload the page. Are you sure?')) {
                      return
                    }

                    sessionStorage.setItem(
                      'dt_toolboxes_visible',
                      JSON.stringify(!JSON.parse(sessionStorage.getItem('dt_toolboxes_visible'))),
                    )

                    /* the saved states must be removed, the save state has precedence over dt initialization values */
                    Object.keys(sessionStorage)
                      .filter((key) => key.startsWith('DataTables_'))
                      .map((key) => sessionStorage.removeItem(key))

                    location.reload()
                  }}
                >
                  Toggle DT toolboxes (<span id="menu_dt_toolboxes_visible_value"></span>)
                </a>
                <Link className="dropdown-item" to="/auth/profile">
                  Profile
                </Link>
                <a className="dropdown-item" href="/logout">
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
