import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '1',
  recordsFiltered: '1',
  data: [
    {
      "id": 1,
      "address": "127.3.5.6",
      "hostname": "lens.hostname.test <XSS>",
      "services": 3,
      "vulns": 2,
      "tags": ["dummy test tag"]
    }]
}

export const lensHostListHandler = rest.post('/backend/lens/host/list.json', (_req, res, ctx) => {
  return res(ctx.json(data))
})
