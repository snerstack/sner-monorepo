import { rest } from 'msw'

const data = {}

export const logoutHandler = rest.get('/backend/auth/logout', (_, res, ctx) => {
  return res(ctx.json(data))
})
