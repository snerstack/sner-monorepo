import { getFilterQueryParam } from '@/tests/mocks/lib'
import { http, HttpResponse } from 'msw'

const data = {
  data: [
    {
      cnt_notes: 2,
      xtype: 'cpe',
    },
    {
      cnt_notes: 2,
      xtype: 'nmap.banner_dict',
    },
    {
      cnt_notes: 1,
      xtype: 'hostnames',
    },
    {
      cnt_notes: 1,
      xtype: 'sner.testnote',
    },
    {
      cnt_notes: 1,
      xtype: null,
    },
  ],
  draw: '1',
  recordsFiltered: '5',
  recordsTotal: '5',
}

export const noteGroupedHandler = http.post('/backend/storage/note/grouped.json', ({ request }) => {
  const filter = getFilterQueryParam(request)

  if (filter === 'Note.xtype=="cpe"') {
    return HttpResponse.json({
      draw: '1',
      recordsTotal: '1',
      recordsFiltered: '1',
      data: [data.data[0]]
    })
  }

  return HttpResponse.json(data)
})
