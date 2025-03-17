import { http, HttpResponse } from 'msw'

export const hostLookupHandler = http.get('/backend/storage/host/lookup', () => {
  return HttpResponse.json({"url": "/storage/host/view/54"})
})
