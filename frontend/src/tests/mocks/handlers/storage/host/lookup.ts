import { rest } from 'msw'

export const hostLookupHandler = rest.get('/backend/storage/host/lookup', (_req, res, ctx) => {
  return res(ctx.json({"url": "/storage/host/view/54"}))
})
