import { http, HttpResponse } from 'msw'

const data = {
  data: [
    {
      _buttons: 1,
      active: true,
      apikey: true,
      email: null,
      id: 1,
      roles: ['admin', 'agent', 'operator', 'user'],
      username: 'test_admin',
    },
    {
      _buttons: 1,
      active: true,
      apikey: false,
      email: 'user@test.com',
      id: 3,
      roles: ['user'],
      username: 'test_user',
    },
    {
      _buttons: 1,
      active: true,
      apikey: false,
      email: null,
      id: 11,
      roles: ['operator'],
      username: 'test_operator',
    },
  ],
  draw: '1',
  recordsFiltered: '3',
  recordsTotal: '3',
}

export const userListHandler = http.post('/backend/auth/user/list.json', () => {
  return HttpResponse.json(data)
})
