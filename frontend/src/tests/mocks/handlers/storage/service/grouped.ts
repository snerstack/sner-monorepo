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

export const serviceGroupedHandler = rest.post(
  '/backend/storage/service/grouped.json',
  (req, res, ctx) => {
    if (req.url.searchParams.get('filter') === 'Host.address=="127.4.4.4"') {
      return res(ctx.json({ draw: '1', recordsTotal: '2', recordsFiltered: '2', data: [data.data[0], data.data[1]] }))
    }

    return res(ctx.json(data))
  },
)
