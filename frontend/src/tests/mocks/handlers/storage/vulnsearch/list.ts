import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '1',
  recordsFiltered: '1',
  data: [
    {
      _select: 1,
      id: '13c23e9861e2a42ad6ce66aee0927f80',
      host_id: 3,
      host_address: '127.5.5.5',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 80,
      service: '80/tcp',
      via_target: null,
      cveid: 'CVE-1900-0000',
      cvss: 1.3,
      cvss3: 2.4,
      attack_vector: 'NETWORK',
      cpe_full: null,
      name: 'dummy cve',
      tags: [],
      comment: null,
      _buttons: 1,
    },
    {
      _select: 1,
      id: '13c23e9861e2a42ad6ce66aee0927f81',
      host_id: 3,
      host_address: '127.4.4.4',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 433,
      service: '433/tcp',
      via_target: null,
      cveid: 'CVE-1900-0001',
      cvss: 1.3,
      cvss3: 2.4,
      attack_vector: 'NETWORK',
      cpe_full: null,
      name: 'dummy cve 2',
      tags: [],
      comment: null,
      _buttons: 1,
    },
  ],
}

export const vulnSearchListHandler = rest.post(
  '/backend/storage/vulnsearch/list.json',
  (req, res, ctx) => {
    if (req.url.searchParams.get('filter') === 'Host.address=="127.5.5.5"') {
      return res(ctx.json({ draw: '1', recordsTotal: '1', recordsFiltered: '1', data: [data.data[0]] }))
    }

    return res(ctx.json(data))
  },
)
