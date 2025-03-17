import { http, HttpResponse } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '4',
  recordsFiltered: '4',
  data: [
    {
      _select: 1,
      id: '3a6231ea38e8ef61002be36f1e0acdf7',
      host_id: 3,
      host_address: '127.5.5.5',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 80,
      service: '80/tcp',
      via_target: null,
      product: 'apache http_server',
      version: '2.2.21',
      extra: '{}',
      tags: [],
      comment: null,
    },
    {
      _select: 1,
      id: '59963e2dcadee8233630bcbe1f3f835f',
      host_id: 1,
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'tcp',
      service_port: 12345,
      service: '12345/tcp',
      via_target: null,
      product: 'microsoft windows_nt',
      version: '3.5.1',
      extra: '{}',
      tags: [],
      comment: null,
    },
    {
      _select: 1,
      id: 'ec670a977a22ee13ce4bbed0e69133d6',
      host_id: 3,
      host_address: '127.5.5.5',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 80,
      service: '80/tcp',
      via_target: null,
      product: 'dummy',
      version: '1.1',
      extra: '{"os": "xssdummy<script>alert(window);</script>"}',
      tags: [],
      comment: null,
    },
    {
      _select: 1,
      id: '8bcf677a339c4006f7637626201eb200',
      host_id: 3,
      host_address: '127.5.5.5',
      host_hostname: 'productdummy',
      service_proto: 'tcp',
      service_port: 80,
      service: '80/tcp',
      via_target: null,
      product: 'apache httpd',
      version: '0.0',
      extra: '{}',
      tags: [],
      comment: null,
    },
  ],
}

export const versioninfoListHandler = http.post('/backend/storage/versioninfo/list.json', ({ request }) => {
    const url = new URL(request.url)
    const product = url.searchParams.get('product')
    const versionspec = url.searchParams.get('versionspec')

    if ((product === 'apache') && (versionspec === '<=2.0')) {
      return HttpResponse.json({
        draw: '1',
        recordsTotal: '4',
        recordsFiltered: '1',
        data: [data.data[0]]
      })
    }

    return HttpResponse.json(data)
  }
)
