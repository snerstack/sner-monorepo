import { webauthnListHandler } from './handlers/auth/profile/webauthn/list'
import { userListHandler } from './handlers/auth/user/list'
import { jobListHandler } from './handlers/scheduler/job/list'
import { queueListHandler } from './handlers/scheduler/queue/list'
import { hostListHandler } from './handlers/storage/host/list'

export const handlers = [jobListHandler, queueListHandler, userListHandler, webauthnListHandler, hostListHandler]
