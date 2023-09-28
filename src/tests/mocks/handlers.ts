import { webauthnListHandler } from './handlers/auth/profile/webauthn/list'
import { userListHandler } from './handlers/auth/user/list'
import { jobListHandler } from './handlers/scheduler/job/list'
import { queueListHandler } from './handlers/scheduler/queue/list'
import { hostListHandler } from './handlers/storage/host/list'
import { noteListHandler } from './handlers/storage/note/list'
import { serviceGroupedHandler } from './handlers/storage/service/grouped'
import { serviceListHandler } from './handlers/storage/service/list'
import { vulnListHandler } from './handlers/storage/vuln/list'

export const handlers = [
  jobListHandler,
  queueListHandler,
  userListHandler,
  webauthnListHandler,
  hostListHandler,
  serviceListHandler,
  serviceGroupedHandler,
  vulnListHandler,
  noteListHandler,
]
