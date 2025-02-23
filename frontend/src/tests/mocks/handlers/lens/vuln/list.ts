import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '1',
  recordsFiltered: '1',
  data: [
    {
      "id": 44,
      "host_id": 1,
      "host_address": "127.7.8.9",
      "host_hostname": "lens.hostname.test",
      "service_proto": "tcp",
      "service_port": 11,
      "service": "11/tcp",
      "via_target": "127.7.8.9",
      "name": "dummy vuln name",
      "xtype": "xtype.dummy",
      "severity": "low",
      "refs": [],
      "tags": [],
    }
  ]
}

export const lensVulnListHandler = rest.post('/backend/lens/vuln/list.json', (_req, res, ctx) => {
  return res(ctx.json(data))
})
