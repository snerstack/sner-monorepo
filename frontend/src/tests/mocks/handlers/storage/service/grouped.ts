import { http, HttpResponse } from 'msw'

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

export const serviceGroupedHandler = http.post('/backend/storage/service/grouped.json', ({ request }) => {
    const url = new URL(request.url)

    // url.searchParams.size is undefined in nodejs
    if (Array.from(url.searchParams).length === 0) {
      return HttpResponse.json(data)
    }

    const filter = url.searchParams.get('filter')
    const crop = url.searchParams.get('crop')
        
    const filtered = JSON.parse(JSON.stringify(data)) as Data

    if (filter === 'Host.address=="127.4.4.4"') {
      filtered.data = filtered.data.slice(0, 2);
    }

    if (crop) {
      const cropLength = parseInt(crop)
      filtered.data.forEach((item: DataItem) => {
        if (item.info) {
          item.info = item.info.split(' ').slice(0, cropLength).join(' ');
        }
      })
    }

    filtered.recordsFiltered = filtered.data.length.toString()
    return HttpResponse.json(filtered)
  }
)
