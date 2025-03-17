import { http, HttpResponse } from 'msw'

const data = {hosts: [{label: 'dummy', host_id: 1}], services: [{label: '11', 'port': 11}]}

export const quickjumpHandler = http.get('/backend/storage/quickjump_autocomplete', () => {
  return HttpResponse.json(data)
})
