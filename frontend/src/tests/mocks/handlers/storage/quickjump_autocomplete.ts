import { rest } from 'msw'

const data = {hosts: [{label: 'dummy', host_id: 1}], services: [{label: '11', 'port': 11}]}

export const quickjumpHandler = rest.get('/backend/storage/quickjump_autocomplete', (_, res, ctx) => {
  return res(ctx.json(data))
})
