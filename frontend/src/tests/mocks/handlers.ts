import { logoutHandler } from './handlers/auth/logout'
import { webauthnListHandler } from './handlers/auth/profile/webauthn/list'
import { userListHandler } from './handlers/auth/user/list'
import { jobListHandler } from './handlers/scheduler/job/list'
import { queueListHandler } from './handlers/scheduler/queue/list'
import { hostListHandler } from './handlers/storage/host/list'
import { noteGroupedHandler } from './handlers/storage/note/grouped'
import { noteListHandler } from './handlers/storage/note/list'
import { quickjumpHandler } from './handlers/storage/quickjump_autocomplete'
import { serviceGroupedHandler } from './handlers/storage/service/grouped'
import { serviceListHandler } from './handlers/storage/service/list'
import { versioninfoListHandler } from './handlers/storage/versioninfo/list'
import { vulnGroupedHandler } from './handlers/storage/vuln/grouped'
import { vulnListHandler } from './handlers/storage/vuln/list'
import { multicopyEndpointsHandler } from './handlers/storage/vuln/multicopy_endpoints'
import { vulnSearchListHandler } from './handlers/storage/vulnsearch/list'
import { dnsTreeHandler } from './handlers/visuals/dnstree'

export const handlers = [
  jobListHandler,
  queueListHandler,
  userListHandler,
  webauthnListHandler,
  hostListHandler,
  serviceListHandler,
  serviceGroupedHandler,
  vulnListHandler,
  vulnGroupedHandler,
  multicopyEndpointsHandler,
  noteListHandler,
  noteGroupedHandler,
  versioninfoListHandler,
  vulnSearchListHandler,
  dnsTreeHandler,
  logoutHandler,
  quickjumpHandler,
]
