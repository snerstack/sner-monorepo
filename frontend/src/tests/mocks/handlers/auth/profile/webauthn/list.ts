import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '1',
  recordsFiltered: '1',
  data: [
    {
      id: 4,
      registered: '2023-09-14T17:50:46',
      name: 'test_webauthn_cred',
      _buttons: 1,
    },
  ],
}
export const webauthnListHandler = rest.post(
  '/backend/auth/profile/webauthn/list.json',
  (_, res, ctx) => {
    return res(ctx.json(data))
  },
)
