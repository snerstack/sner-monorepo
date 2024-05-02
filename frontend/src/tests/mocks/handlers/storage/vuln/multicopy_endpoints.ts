import { rest } from 'msw'

const data = {
  data: [
    {
      endpoint_id: {
        host_id: 77,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: null,
      service_port: null,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 72,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 22,
      service_info: 'product: OpenSSH version: 7.4p1 Debian 10+deb9u4 extrainfo: protocol 2.0 ostype: Linux',
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 73,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 25,
      service_info: 'product: Postfix smtpd hostname:  localtest',
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 74,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 113,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 75,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 139,
      service_info: 'product: Samba smbd version: 3.X - 4.X extrainfo: workgroup: WORKGROUP hostname: LOCALTEST',
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 76,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 445,
      service_info: 'product: Samba smbd version: 4.5.16-Debian extrainfo: workgroup: WORKGROUP hostname: LOCALTEST',
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 77,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 5432,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 78,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 45589,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 77,
        service_id: 68,
      },
      host_address: '127.0.0.1',
      host_hostname: 'localhost',
      service_proto: 'tcp',
      service_port: 46865,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 37,
      },
      host_address: '127.128.129.130',
      host_hostname: 'serverz.localhost',
      service_proto: null,
      service_port: null,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 37,
        service_id: 52,
      },
      host_address: '127.128.129.130',
      host_hostname: 'serverz.localhost',
      service_proto: 'tcp',
      service_port: 443,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: null,
      service_port: null,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
        service_id: 71,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'udp',
      service_port: 455,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
        service_id: 69,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'tcp',
      service_port: 800,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
        service_id: 79,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'tcp',
      service_port: 999,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
        service_id: 70,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'udp',
      service_port: 999,
      service_info: null,
    },
    {
      endpoint_id: {
        host_id: 1,
        service_id: 1,
      },
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: 'tcp',
      service_port: 12345,
      service_info: 'testservice banner',
    },
  ],
}

export const multicopyEndpointsHandler = rest.post(
  '/backend/storage/vuln/multicopy_endpoints.json',
  (_, res, ctx) => {
    return res(ctx.json(data))
  },
)
