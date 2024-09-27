import { rest } from 'msw'

export const hostLookupHandler = rest.get('/backend/storage/host/lookup', (_, res, ctx) => {
  return res(ctx.json({"url": "/storage/host/view/54"}))
})
