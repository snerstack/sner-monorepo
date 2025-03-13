import BaseLayout from '@/layouts/BaseLayout'
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
import ForbiddenPage from '@/routes/forbidden'
import LensPage from '@/routes/lens'
import LensHostListPage from '@/routes/lens/host/list'
import LensHostViewPage from '@/routes/lens/host/view'
import LensServiceListPage from '@/routes/lens/service/list'
import LensVulnListPage from '@/routes/lens/vuln/list'
import NotFoundPage from '@/routes/notfound'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RootPage from '@/routes/root'
import JobListPage from '@/routes/scheduler/job/list'
import QueueAddPage from '@/routes/scheduler/queue/add'
import QueueEditPage from '@/routes/scheduler/queue/edit'
import QueueEnqueuePage from '@/routes/scheduler/queue/enqueue'
import QueueListPage from '@/routes/scheduler/queue/list'
import HostAddPage from '@/routes/storage/host/add'
import HostEditPage from '@/routes/storage/host/edit'
import HostListPage from '@/routes/storage/host/list'
import HostLookupPage from '@/routes/storage/host/lookup'
import HostViewPage from '@/routes/storage/host/view'
import NoteAddPage from '@/routes/storage/note/add'
import NoteEditPage from '@/routes/storage/note/edit'
import NoteGroupedPage from '@/routes/storage/note/grouped'
import NoteListPage from '@/routes/storage/note/list'
import NoteViewPage from '@/routes/storage/note/view'
import ServiceAddPage from '@/routes/storage/service/add'
import ServiceEditPage from '@/routes/storage/service/edit'
import ServiceGroupedPage from '@/routes/storage/service/grouped'
import ServiceListPage from '@/routes/storage/service/list'
import VersionInfosListPage from '@/routes/storage/versioninfo/list'
import VulnAddPage from '@/routes/storage/vuln/add'
import VulnEditPage from '@/routes/storage/vuln/edit'
import VulnGroupedPage from '@/routes/storage/vuln/grouped'
import VulnListPage from '@/routes/storage/vuln/list'
import VulnMulticopyPage from '@/routes/storage/vuln/multicopy'
import VulnViewPage from '@/routes/storage/vuln/view'
import SwaggerPage from '@/routes/swagger'
import VisualsPage from '@/routes/visuals'
import DnsTreePage from '@/routes/visuals/dnstree'
import InternalsPage from '@/routes/visuals/internals'
import PortinfosPage from '@/routes/visuals/portinfos'
import PortmapPage from '@/routes/visuals/portmap'
import { Route, createRoutesFromElements, redirect } from 'react-router-dom'

import { httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

const requestDataHandler = async (url: string) => {
  try {
    const resp = await httpClient.get<unknown>(urlFor(url))

    return resp.data
  } catch {
    return redirect('/not-found')
  }
}

export const routes = createRoutesFromElements(
  <Route path="/" element={<BaseLayout />}>
    <Route index element={<RootPage />} />

    <Route element={<ProtectedRoute requiredRole="user" />}>
      <Route path="lens" element={<LensPage />} />
      <Route path="lens/host/list" element={<LensHostListPage />} />
      <Route
        path="lens/host/view/:id"
        element={<LensHostViewPage />}
        loader={async ({ params: { id } }) => requestDataHandler(`/backend/lens/host/view/${id}.json`)}
      />
      <Route path="lens/service/list" element={<LensServiceListPage />} />
      <Route path="lens/vuln/list" element={<LensVulnListPage />} />
    </Route>

    <Route path="swagger" element={<SwaggerPage />} />

    <Route path="auth">
      <Route path="login" element={<LoginPage />} />
      <Route path="login_totp" element={<TOTPLoginPage />} />
      <Route path="login_webauthn" element={<WebAuthnLoginPage />} />
      <Route element={<ProtectedRoute requiredRole="user" />}>
        <Route path="profile">
          <Route index element={<ProfilePage />} loader={async () => requestDataHandler(`/backend/auth/profile.json`)} />
          <Route path="changepassword" element={<ChangePasswordPage />} />
          <Route path="totp" element={<TOTPPage />} loader={async () => requestDataHandler(`/backend/auth/profile/totp`)} />
          <Route path="webauthn">
            <Route path="register" element={<WebAuthnRegisterPage />} />
            <Route
              path="edit/:id"
              element={<WebAuthnEditPage />}
              loader={async ({ params: { id } }) => requestDataHandler(`/backend/auth/profile/webauthn/${id}.json`)}
            />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="user">
          <Route path="list" element={<UserListPage />} />
          <Route path="add" element={<UserAddPage />} />
          <Route
            path="edit/:id"
            element={<UserEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/auth/user/${id}.json`)}
          />
        </Route>
      </Route>
    </Route>

    <Route element={<ProtectedRoute requiredRole="operator" />}>
      <Route path="scheduler">
        <Route path="queue">
          <Route path="list" element={<QueueListPage />} />
          <Route path="add" element={<QueueAddPage />} />
          <Route
            path="edit/:id"
            element={<QueueEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/scheduler/queue/${id}.json`)}
          />
          <Route path="enqueue/:id" element={<QueueEnqueuePage />} />
        </Route>
        <Route path="job">
          <Route path="list" element={<JobListPage />} />
        </Route>
      </Route>
    </Route>

    <Route element={<ProtectedRoute requiredRole="operator" />}>
      <Route path="storage">
        <Route path="host">
          <Route path="list" element={<HostListPage />} />
          <Route path="add" element={<HostAddPage />} />
          <Route
            path="edit/:id"
            element={<HostEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/host/view/${id}.json`)}
          />
          <Route
            path="view/:id"
            element={<HostViewPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/host/view/${id}.json`)}
          />
          <Route path="lookup" element={<HostLookupPage />} />
        </Route>
        <Route path="service">
          <Route path="list" element={<ServiceListPage />} />
          <Route
            path="add/:id"
            element={<ServiceAddPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/host/view/${id}.json`)}
          />
          <Route
            path="edit/:id"
            element={<ServiceEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/service/view/${id}.json`)}
          />
          <Route path="grouped" element={<ServiceGroupedPage />} />
        </Route>
        <Route path="vuln">
          <Route path="list" element={<VulnListPage />} />
          <Route path="add">
            <Route
              path="host/:id"
              element={<VulnAddPage type="host" />}
              loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/host/view/${id}.json`)}
            />
            <Route
              path="service/:id"
              element={<VulnAddPage type="service" />}
              loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/service/view/${id}.json`)}
            />
          </Route>
          <Route
            path="edit/:id"
            element={<VulnEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/vuln/view/${id}.json`)}
          />
          <Route
            path="multicopy/:id"
            element={<VulnMulticopyPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/vuln/view/${id}.json`)}
          />
          <Route
            path="view/:id"
            element={<VulnViewPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/vuln/view/${id}.json`)}
          />
          <Route path="grouped" element={<VulnGroupedPage />} />
        </Route>
        <Route path="note">
          <Route path="list" element={<NoteListPage />} />
          <Route path="add">
            <Route
              path="host/:id"
              element={<NoteAddPage type="host" />}
              loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/host/view/${id}.json`)}
            />
            <Route
              path="service/:id"
              element={<NoteAddPage type="service" />}
              loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/service/view/${id}.json`)}
            />
          </Route>
          <Route
            path="edit/:id"
            element={<NoteEditPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/note/view/${id}.json`)}
          />
          <Route
            path="view/:id"
            element={<NoteViewPage />}
            loader={async ({ params: { id } }) => requestDataHandler(`/backend/storage/note/view/${id}.json`)}
          />
          <Route path="grouped" element={<NoteGroupedPage />} />
        </Route>

        <Route path="versioninfo">
          <Route path="list" element={<VersionInfosListPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="visuals">
      <Route index element={<VisualsPage />} />

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route
          path="internals"
          element={<InternalsPage />}
          loader={async () => requestDataHandler(`/backend/visuals/internals.json`)}
        />
      </Route>
      <Route element={<ProtectedRoute requiredRole="operator" />}>
        <Route path="dnstree" element={<DnsTreePage />} />
        <Route
          path="portmap"
          element={<PortmapPage />}
          loader={async () => requestDataHandler(`/backend/visuals/portmap.json`)}
        />
        <Route path="portinfos" element={<PortinfosPage />} />
      </Route>
    </Route>

    <Route path="forbidden" element={<ForbiddenPage />} />
    <Route path="not-found" element={<NotFoundPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>,
)
