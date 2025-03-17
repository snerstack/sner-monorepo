import { getFilterQueryParam } from '@/tests/mocks/lib'
import { http, HttpResponse } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '3',
  recordsFiltered: '3',
  data: [
    {
      name: 'aggregable vuln',
      severity: 'medium',
      tags: ['reportdata'],
      cnt_vulns: 2,
    },
    {
      name: 'PHP 5.6.x < 5.6.32 Multiple Vulnerabilities',
      severity: 'critical',
      tags: [],
      cnt_vulns: 1,
    },
    {
      name: 'test vulnerability',
      severity: 'medium',
      tags: ['report', 'tag2', 'tag1', 'xdd'],
      cnt_vulns: 1,
    },
  ],
}

export const vulnGroupedHandler = http.post('/backend/storage/vuln/grouped.json', ({ request }) => {
  const filter = getFilterQueryParam(request)

  if (filter === 'Vuln.name=="aggregable vuln"') {
    return HttpResponse.json({
      draw: '1',
      recordsTotal: '1',
      recordsFiltered: '1',
      data: [data.data[0]]
    })
  }

  return HttpResponse.json(data)
})
