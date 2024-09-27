import { logoutHandler } from '@/tests/mocks/handlers/auth/logout'
import { webauthnListHandler } from '@/tests/mocks/handlers/auth/profile/webauthn/list'
import { userListHandler } from '@/tests/mocks/handlers/auth/user/list'
import { jobListHandler } from '@/tests/mocks/handlers/scheduler/job/list'
import { queueListHandler } from '@/tests/mocks/handlers/scheduler/queue/list'
import { hostListHandler } from '@/tests/mocks/handlers/storage/host/list'
import { hostLookupHandler } from '@/tests/mocks/handlers/storage/host/lookup'
import { noteGroupedHandler } from '@/tests/mocks/handlers/storage/note/grouped'
import { noteListHandler } from '@/tests/mocks/handlers/storage/note/list'
import { quickjumpHandler } from '@/tests/mocks/handlers/storage/quickjump_autocomplete'
import { serviceGroupedHandler } from '@/tests/mocks/handlers/storage/service/grouped'
import { serviceListHandler } from '@/tests/mocks/handlers/storage/service/list'
import { versioninfoListHandler } from '@/tests/mocks/handlers/storage/versioninfo/list'
import { vulnGroupedHandler } from '@/tests/mocks/handlers/storage/vuln/grouped'
import { vulnListHandler } from '@/tests/mocks/handlers/storage/vuln/list'
import { multicopyEndpointsHandler } from '@/tests/mocks/handlers/storage/vuln/multicopy_endpoints'
import { vulnSearchListHandler } from '@/tests/mocks/handlers/storage/vulnsearch/list'
import { dnsTreeHandler } from '@/tests/mocks/handlers/visuals/dnstree'

export const handlers = [
  dnsTreeHandler,
  hostListHandler,
  hostLookupHandler,
  jobListHandler,
  logoutHandler,
  multicopyEndpointsHandler,
  noteGroupedHandler,
  noteListHandler,
  queueListHandler,
  quickjumpHandler,
  serviceGroupedHandler,
  serviceListHandler,
  userListHandler,
  versioninfoListHandler,
  vulnGroupedHandler,
  vulnListHandler,
  vulnSearchListHandler,
  webauthnListHandler,
]
