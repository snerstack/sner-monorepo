import { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { userState } from '@/atoms/userAtom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RootPage from '@/routes/root'
import NotFoundPage from '@/routes/404'
import LoginPage from '@/routes/auth/login'
import BaseLayout from '@/layouts/BaseLayout'
import UserListPage from '@/routes/auth/user/list'
import UserAddPage from '@/routes/auth/user/add'
import UserEditPage from '@/routes/auth/user/edit'
import ProfilePage from '@/routes/auth/profile'
import ChangePasswordPage from '@/routes/auth/profile/changepassword'
import TOTPPage from '@/routes/auth/profile/totp'
import WebAuthnRegisterPage from '@/routes/auth/profile/webauthn/register'
import WebAuthnEditPage from '@/routes/auth/profile/webauthn/edit'
import TOTPLoginPage from '@/routes/auth/login_totp'
import WebAuthnLoginPage from '@/routes/auth/login_webauthn'
import QueueListPage from '@/routes/scheduler/queue/list'
import QueueAddPage from '@/routes/scheduler/queue/add'
import QueueEditPage from '@/routes/scheduler/queue/edit'
import QueueEnqueuePage from '@/routes/scheduler/queue/enqueue'
import JobListPage from '@/routes/scheduler/job/list'
import HostListPage from '@/routes/storage/host/list'
import HostAddPage from '@/routes/storage/host/add'
import HostEditPage from '@/routes/storage/host/edit'
import ServiceListPage from '@/routes/storage/service/list'
import ServiceAddPage from '@/routes/storage/service/add'
import ServiceEditPage from '@/routes/storage/service/edit'
import ServiceGroupedPage from '@/routes/storage/service/grouped'
import VulnListPage from '@/routes/storage/vuln/list'
import VulnAddPage from '@/routes/storage/vuln/add'
import VulnEditPage from '@/routes/storage/vuln/edit'
import VulnGroupedPage from '@/routes/storage/vuln/grouped'
import NoteListPage from '@/routes/storage/note/list'
import NoteAddPage from '@/routes/storage/note/add'
import NoteEditPage from '@/routes/storage/note/edit'
import VisualsPage from '@/routes/visuals'
import httpClient from '@/lib/httpClient'
import ProtectedRoute from '@/routes/ProtectedRoute'
import NotAuthorizedPage from '@/routes/403'

export default function App() {
  const [user, setUser] = useRecoilState(userState)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const authHandler = async () => {
    try {
      const user = await httpClient.get(import.meta.env.VITE_SERVER_URL + '/auth/user/@me')

      console.log(import.meta.env.VITE_TAGS_HOST)

      setUser({ ...user.data, isAuthenticated: true })
      setIsChecking(false)
    } catch (err) {}
  }

  useEffect(() => {
    authHandler()
  }, [])

  if (isChecking) return <></>

  return (
    <BrowserRouter>
      <BaseLayout>
        <Routes>
          <Route path="/" element={<RootPage />} />

          <Route path="auth">
            <Route path="login" element={<LoginPage />} />
            <Route path="login_totp" element={<TOTPLoginPage />} />
            <Route path="login_webauthn" element={<WebAuthnLoginPage />} />
            <Route
              element={<ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('user')} />}
            >
              <Route path="profile">
                <Route index element={<ProfilePage />} />
                <Route path="changepassword" element={<ChangePasswordPage />} />
                <Route path="totp" element={<TOTPPage />} />
                <Route path="webauthn">
                  <Route path="register" element={<WebAuthnRegisterPage />} />
                  <Route path="edit" element={<WebAuthnEditPage />} />
                </Route>
              </Route>
            </Route>
            <Route
              element={
                <ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('admin')} />
              }
            >
              <Route path="user">
                <Route path="list" element={<UserListPage />} />
                <Route path="add" element={<UserAddPage />} />
                <Route path="edit/:id" element={<UserEditPage />} />
              </Route>
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('operator')} />
            }
          >
            <Route path="scheduler">
              <Route path="queue">
                <Route path="list" element={<QueueListPage />} />
                <Route path="add" element={<QueueAddPage />} />
                <Route path="edit/:id" element={<QueueEditPage />} />
                <Route path="enqueue/:id" element={<QueueEnqueuePage />} />
              </Route>
              <Route path="job">
                <Route path="list" element={<JobListPage />} />
              </Route>
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute authenticated={user.isAuthenticated} authorized={user.roles.includes('operator')} />
            }
          >
            <Route path="storage">
              <Route path="host">
                <Route path="list" element={<HostListPage />} />
                <Route path="add" element={<HostAddPage />} />
                <Route path="edit/:id" element={<HostEditPage />} />
              </Route>
              <Route path="service">
                <Route path="list" element={<ServiceListPage />} />
                <Route path="add/:id" element={<ServiceAddPage />} />
                <Route path="edit/:id" element={<ServiceEditPage />} />
                <Route path="grouped" element={<ServiceGroupedPage />} />
              </Route>
              <Route path="vuln">
                <Route path="list" element={<VulnListPage />} />
                <Route path="add">
                  <Route path="host/:id" element={<VulnAddPage />} />
                  <Route path="service/:id" element={<VulnAddPage />} />
                </Route>
                <Route path="edit/:id" element={<VulnEditPage />} />
                <Route path="grouped" element={<VulnGroupedPage />} />
              </Route>
              <Route path="note">
                <Route path="list" element={<NoteListPage />} />
                <Route path="add">
                  <Route path="host/:id" element={<NoteAddPage />} />
                  <Route path="service/:id" element={<NoteAddPage />} />
                </Route>
                <Route path="edit/:id" element={<NoteEditPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="visuals">
            <Route index element={<VisualsPage />} />
          </Route>

          <Route path="forbidden" element={<NotAuthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BaseLayout>
    </BrowserRouter>
  )
}
