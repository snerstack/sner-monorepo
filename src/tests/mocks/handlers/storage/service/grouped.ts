import { rest } from 'msw'

const data = {
  data: [
    {
      cnt_services: 6,
      info: null,
    },
    {
      cnt_services: 1,
      info: 'testservice banner',
    },
    {
      cnt_services: 1,
      info: 'test info',
    },
  ],
  draw: '1',
  recordsFiltered: '3',
  recordsTotal: '3',
}

export const serviceGroupedHandler = rest.post('http://localhost:18000/storage/service/grouped.json', (_, res, ctx) => {
  return res(ctx.json(data))
})
