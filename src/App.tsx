import HostViewPage from './routes/storage/host/view'
import NoteViewPage from './routes/storage/note/view'
import VulnMulticopyPage from './routes/storage/vuln/multicopy'
import VulnViewPage from './routes/storage/vuln/view'
import DnsTreePage from './routes/visuals/dnstree'
import InternalsPage from './routes/visuals/internals'
import PortinfosPage from './routes/visuals/portinfos'
import PortmapPage from './routes/visuals/portmap'
import BaseLayout from '@/layouts/BaseLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import LoginPage from '@/routes/auth/login'
import TOTPLoginPage from '@/routes/auth/login_totp'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import ProfilePage from '@/routes/auth/profile'
import ChangePasswordPage from '@/routes/auth/profile/changepassword'
import TOTPPage from '@/routes/auth/profile/totp'
import WebAuthnEditPage from '@/routes/auth/profile/webauthn/edit'
import WebAuthnRegisterPage from '@/routes/auth/profile/webauthn/register'
import UserAddPage from '@/routes/auth/user/add'
import UserEditPage from '@/routes/auth/user/edit'
import UserListPage from '@/routes/auth/user/list'
import NotAuthorizedPage from '@/routes/forbidden'
import NotFoundPage from '@/routes/not-found'
import RootPage from '@/routes/root'
import JobListPage from '@/routes/scheduler/job/list'
import QueueAddPage from '@/routes/scheduler/queue/add'
import QueueEditPage from '@/routes/scheduler/queue/edit'
import QueueEnqueuePage from '@/routes/scheduler/queue/enqueue'
import QueueListPage from '@/routes/scheduler/queue/list'
import HostAddPage from '@/routes/storage/host/add'
import HostEditPage from '@/routes/storage/host/edit'
import HostListPage from '@/routes/storage/host/list'
import NoteAddPage from '@/routes/storage/note/add'
import NoteEditPage from '@/routes/storage/note/edit'
import NoteListPage from '@/routes/storage/note/list'
import ServiceAddPage from '@/routes/storage/service/add'
import ServiceEditPage from '@/routes/storage/service/edit'
import ServiceGroupedPage from '@/routes/storage/service/grouped'
import ServiceListPage from '@/routes/storage/service/list'
import VulnAddPage from '@/routes/storage/vuln/add'
import VulnEditPage from '@/routes/storage/vuln/edit'
import VulnGroupedPage from '@/routes/storage/vuln/grouped'
import VulnListPage from '@/routes/storage/vuln/list'
import VisualsPage from '@/routes/visuals'
import env from 'app-env'
import { useEffect, useState } from 'react'
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements, redirect } from 'react-router-dom'
import { useRecoilState } from 'recoil'
import { RecoilRoot } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

function App() {
  const [user, setUser] = useRecoilState(userState)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const authHandler = () => {
    httpClient
      .get<User>(env.VITE_SERVER_URL + '/auth/user/@me')
      .then((resp) => {
        setUser({ ...resp.data, isAuthenticated: true })
        setIsChecking(false)
      })
      .catch(() => {
        setIsChecking(false)
      })
  }

  useEffect(() => {
    authHandler()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestDataHandler = async (url: string) => {
    try {
      const resp = await httpClient.get(env.VITE_SERVER_URL + url)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return resp.data
    } catch {
      return redirect('/404')
    }
  }

  if (isChecking) return <></>

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<BaseLayout />}>
        <Route index element={<RootPage />} />

        <Route path="auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="login_totp" element={<TOTPLoginPage />} />
          <Route path="login_webauthn" element={<WebAuthnLoginPage />} />
          <Route
            element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('user')} />}
          >
            <Route path="profile">
              <Route index element={<ProfilePage />} loader={async () => requestDataHandler(`/auth/profile.json`)} />
              <Route path="changepassword" element={<ChangePasswordPage />} />
              <Route path="totp" element={<TOTPPage />} loader={async () => requestDataHandler(`/auth/profile/totp`)} />
              <Route path="webauthn">
                <Route path="register" element={<WebAuthnRegisterPage />} />
                <Route
                  path="edit/:id"
                  element={<WebAuthnEditPage />}
                  loader={async ({ params: { id } }) => requestDataHandler(`/auth/profile/webauthn/${id}.json`)}
                />
              </Route>
            </Route>
          </Route>
          <Route
            element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('admin')} />}
          >
            <Route path="user">
              <Route path="list" element={<UserListPage />} />
              <Route path="add" element={<UserAddPage />} />
              <Route
                path="edit/:id"
                element={<UserEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/auth/user/${id}.json`)}
              />
            </Route>
          </Route>
        </Route>

        <Route
          element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('operator')} />}
        >
          <Route path="scheduler">
            <Route path="queue">
              <Route path="list" element={<QueueListPage />} />
              <Route path="add" element={<QueueAddPage />} />
              <Route
                path="edit/:id"
                element={<QueueEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/scheduler/queue/${id}.json`)}
              />
              <Route path="enqueue/:id" element={<QueueEnqueuePage />} />
            </Route>
            <Route path="job">
              <Route path="list" element={<JobListPage />} />
            </Route>
          </Route>
        </Route>

        <Route
          element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('operator')} />}
        >
          <Route path="storage">
            <Route path="host">
              <Route path="list" element={<HostListPage />} />
              <Route path="add" element={<HostAddPage />} />
              <Route
                path="edit/:id"
                element={<HostEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/host/view/${id}.json`)}
              />
              <Route
                path="view/:id"
                element={<HostViewPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/host/view/${id}.json`)}
              />
            </Route>
            <Route path="service">
              <Route path="list" element={<ServiceListPage />} />
              <Route
                path="add/:id"
                element={<ServiceAddPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/host/view/${id}.json`)}
              />
              <Route
                path="edit/:id"
                element={<ServiceEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/service/view/${id}.json`)}
              />
              <Route path="grouped" element={<ServiceGroupedPage />} />
            </Route>
            <Route path="vuln">
              <Route path="list" element={<VulnListPage />} />
              <Route path="add">
                <Route
                  path="host/:id"
                  element={<VulnAddPage type="host" />}
                  loader={async ({ params: { id } }) => requestDataHandler(`/storage/host/view/${id}.json`)}
                />
                <Route
                  path="service/:id"
                  element={<VulnAddPage type="service" />}
                  loader={async ({ params: { id } }) => requestDataHandler(`/storage/service/view/${id}.json`)}
                />
              </Route>
              <Route
                path="edit/:id"
                element={<VulnEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/vuln/view/${id}.json`)}
              />
              <Route
                path="multicopy/:id"
                element={<VulnMulticopyPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/vuln/view/${id}.json`)}
              />
              <Route
                path="view/:id"
                element={<VulnViewPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/vuln/view/${id}.json`)}
              />
              <Route path="grouped" element={<VulnGroupedPage />} />
            </Route>
            <Route path="note">
              <Route path="list" element={<NoteListPage />} />
              <Route path="add">
                <Route
                  path="host/:id"
                  element={<NoteAddPage type="host" />}
                  loader={async ({ params: { id } }) => requestDataHandler(`/storage/host/view/${id}.json`)}
                />
                <Route
                  path="service/:id"
                  element={<NoteAddPage type="service" />}
                  loader={async ({ params: { id } }) => requestDataHandler(`/storage/service/view/${id}.json`)}
                />
              </Route>
              <Route
                path="edit/:id"
                element={<NoteEditPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/note/view/${id}.json`)}
              />
              <Route
                path="view/:id"
                element={<NoteViewPage />}
                loader={async ({ params: { id } }) => requestDataHandler(`/storage/note/view/${id}.json`)}
              />
            </Route>
          </Route>
        </Route>

        <Route path="visuals">
          <Route index element={<VisualsPage />} />

          <Route
            element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('admin')} />}
          >
            <Route
              path="internals"
              element={<InternalsPage />}
              loader={async () => requestDataHandler(`/visuals/internals.json`)}
            />
          </Route>
          <Route
            element={
              <ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('operator')} />
            }
          >
            <Route path="dnstree" element={<DnsTreePage />} />
            <Route
              path="portmap"
              element={<PortmapPage />}
              loader={async () => requestDataHandler(`/visuals/portmap.json`)}
            />
            <Route path="portinfos" element={<PortinfosPage />} />
          </Route>
        </Route>

        <Route path="forbidden" element={<NotAuthorizedPage />} />
        <Route path="not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>,
    ),
  )

  return <RouterProvider router={router} />
}

export default function WrappedApp() {
  return (
    <RecoilRoot>
      <App />
    </RecoilRoot>
  )
}
