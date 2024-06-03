import { rest } from 'msw'

interface Data {
  data: DataItem[]
  draw: string
  recordsFiltered: string
  recordsTotal: string
}

interface DataItem {
  cnt_services: number
  info: string
}

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
    if (!req.url.searchParams.keys()) {
      return res(ctx.json(data))
    }

    const filtered = JSON.parse(JSON.stringify(data)) as Data

    if (req.url.searchParams.get('filter') === 'Host.address=="127.4.4.4"') {
      filtered.data = filtered.data.slice(0, 2);
    }

    if (req.url.searchParams.get('crop')) {
      const cropLength = parseInt(req.url.searchParams.get('crop')!)
      filtered.data.forEach((item: DataItem) => {
        if (item.info) {
          item.info = item.info.split(' ').slice(0, cropLength).join(' ');
        }
      })
    }

    filtered.recordsFiltered = filtered.data.length.toString()
    return res(ctx.json(filtered))
  },
)
