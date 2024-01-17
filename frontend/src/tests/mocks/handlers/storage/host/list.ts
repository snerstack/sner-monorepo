import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '3',
  recordsFiltered: '3',
  data: [
    {
      id: 1,
      address: '127.4.4.4',
      hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      os: 'Test Linux 1',
      cnt_s: 1,
      cnt_v: 12,
      cnt_n: 3,
      tags: ['reviewed'],
      comment: '',
      created: '2023-07-17T20:01:09',
      modified: '2023-09-01T12:01:37',
      rescan_time: '2023-07-17T20:01:09',
      _buttons: 1,
    },
    {
      id: 2,
      address: '127.3.3.3',
      hostname: 'testhost1.testdomain.test',
      os: 'Test Linux 2',
      cnt_s: 2,
      cnt_v: 10,
      cnt_n: 2,
      tags: ['reviewed', 'todo'],
      comment: '',
      created: '2023-07-17T20:01:09',
      modified: '2023-09-04T18:52:43',
      rescan_time: '2023-07-17T20:01:09',
      _buttons: 1,
    },
    {
      id: 37,
      address: '127.128.129.130',
      hostname: 'serverz.localhost',
      os: 'Microsoft Windows Vista',
      cnt_s: 1,
      cnt_v: 6,
      cnt_n: 3,
      tags: ['reviewed'],
      comment: 'null',
      created: '2023-07-26T15:41:50',
      modified: '2023-09-01T12:01:37',
      rescan_time: '2023-07-26T15:41:50',
      _buttons: 1,
    },
  ],
}

export const hostListHandler = rest.post('http://localhost:18000/storage/host/list.json', (req, res, ctx) => {
  if (req.url.searchParams.get('filter') === 'Host.address=="127.4.4.4"') {
    return res(ctx.json({ draw: '1', recordsTotal: '1', recordsFiltered: '1', data: [data.data[0]] }))
  }

  return res(ctx.json(data))
})
