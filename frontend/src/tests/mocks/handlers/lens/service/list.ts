import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '1',
  recordsFiltered: '1',
  data: [
    {
      "id": 33,
      "host_id": 1,
      "host_address": "127.3.4.5",
      "host_hostname": "lens.hostname.test",
      "proto": "tcp",
      "port": 133,
      "name": "dummyportname",
      "state": "open:lenstest",
      "info": "dummy service info",
      "tags": [],
    }
  ]
}

export const lensServiceListHandler = rest.post('/backend/lens/service/list.json', (_req, res, ctx) => {
  return res(ctx.json(data))
})
