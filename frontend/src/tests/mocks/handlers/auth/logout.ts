import { http, HttpResponse } from 'msw'

const data = {}

export const logoutHandler = http.get('/backend/auth/logout', () => {
  return HttpResponse.json(data)
})
