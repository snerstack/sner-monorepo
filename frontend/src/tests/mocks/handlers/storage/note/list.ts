import { getFilterQueryParam } from '@/tests/mocks/lib'
import { http, HttpResponse } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '2',
  recordsFiltered: '2',
  data: [
    {
      id: 1,
      host_id: 1,
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'tcp',
      service_port: 12345,
      service: '12345/tcp',
      via_target: 'null',
      xtype: 'deb',
      data: '["cpe:/o:microsoft:windows_nt:3.5.1"]',
      tags: ['report', 'falsepositive', 'info'],
      comment: 'null',
      created: '2023-07-17T20:01:09',
      modified: '2023-08-31T17:50:08',
      import_time: null,
      _buttons: 1,
    },
    {
      id: 3,
      host_id: 2,
      host_address: '127.3.3.3',
      host_hostname: 'testhost1.testdomain.test',
      service_proto: null,
      service_port: null,
      service: '',
      via_target: null,
      xtype: 'sner.testnote',
      data: '',
      tags: [],
      comment: '',
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T15:32:07',
      import_time: null,
      _buttons: 1,
    }
  ],
}

export const noteListHandler = http.post('/backend/storage/note/list.json', ({ request }) => {
  const filter = getFilterQueryParam(request)

  if (filter === 'Host.address=="127.4.4.4"') {
    return HttpResponse.json({
      draw: '1',
      recordsTotal: '1',
      recordsFiltered: '1',
      data: [data.data[0]]
    })
  }

  return HttpResponse.json(data)
})
