import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '3',
  recordsFiltered: '3',
  data: [
    {
      id: 1,
      host_id: 1,
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      proto: 'tcp',
      port: 12345,
      name: 'svcx',
      state: 'open:testreason',
      info: 'testservice banner',
      tags: ['todo'],
      comment: 'manual testservice comment',
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T15:43:48',
      rescan_time: '2023-08-07T08:06:24',
      import_time: null,
      _buttons: 1,
    },
    {
      id: 52,
      host_id: 37,
      host_address: '127.128.129.130',
      host_hostname: 'serverz.localhost',
      proto: 'tcp',
      port: 443,
      name: null,
      state: 'open:nessus',
      info: null,
      tags: [],
      comment: null,
      created: '2023-08-03T13:14:01',
      modified: '2023-08-29T15:43:48',
      rescan_time: '2023-08-03T13:14:01',
      import_time: '2019-03-11T14:23:16',
      _buttons: 1,
    },
    {
      id: 66,
      host_id: 2,
      host_address: '127.3.3.3',
      host_hostname: 'testhost1.testdomain.test',
      proto: 'udp',
      port: 420,
      name: '',
      state: 'open',
      info: 'test info',
      tags: ['report', 'info', 'report:data'],
      comment: '',
      created: '2023-08-24T19:42:12',
      modified: '2023-08-29T15:31:06',
      rescan_time: '2023-08-24T19:42:12',
      import_time: null,
      _buttons: 1,
    },
    {
      id: 4,
      host_id: 4,
      host_address: '2001:db8:85a3::8a2e:370:7334',
      host_hostname: null,
      proto: 'tcp',
      port: 80,
      name: null,
      state: null,
      info: null,
      tags: [],
      comment: null,
      created: '2024-01-28T19:46:39',
      modified: '2024-01-28T19:46:39',
      rescan_time: '2024-01-28T19:46:39',
      import_time: null,
      _buttons: 1,
    },
  ],
}

export const serviceListHandler = rest.post('/backend/storage/service/list.json', (req, res, ctx) => {
  if (req.url.searchParams.get('filter') === 'Host.address=="127.4.4.4"') {
    return res(ctx.json({ draw: '1', recordsTotal: '1', recordsFiltered: '1', data: [data.data[0]] }))
  }

  return res(ctx.json(data))
})
