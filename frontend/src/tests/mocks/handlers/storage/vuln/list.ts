import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '6',
  recordsFiltered: '6',
  data: [
    {
      _select: 1,
      id: 1,
      host_id: 1,
      host_address: '127.4.4.4',
      host_hostname: 'testhost.testdomain.test<script>alert(1);</script>',
      service_proto: null,
      service_port: null,
      service: '',
      via_target: null,
      name: 'aggregable vuln',
      xtype: 'x.agg',
      severity: 'low',
      refs: [],
      tags: ['reportdata'],
      comment: null,
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T14:08:10',
      rescan_time: '2023-07-17T20:01:09',
      import_time: null,
      _buttons: 1,
    },
    {
      _select: 1,
      id: 2,
      host_id: 4,
      host_address: '127.4.4.7',
      host_hostname: 'testhost.testdomain.test',
      service_proto: null,
      service_port: null,
      service: '',
      via_target: null,
      name: 'vuln 2',
      xtype: 'x.vuln',
      severity: 'info',
      refs: [],
      tags: [],
      comment: null,
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T14:08:10',
      rescan_time: '2023-07-17T20:01:09',
      import_time: null,
      _buttons: 1,
    },
    {
      _select: 1,
      id: 3,
      host_id: 2,
      host_address: '127.3.3.3',
      host_hostname: 'testhost1.testdomain.test',
      service_proto: null,
      service_port: null,
      service: '',
      via_target: null,
      name: 'another test vulnerability',
      xtype: 'testxtype.124',
      severity: 'high',
      refs: [],
      tags: [],
      comment: 'another vulnerability comment',
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T14:08:10',
      rescan_time: '2023-07-17T20:01:09',
      import_time: null,
      _buttons: 1,
    },
    {
      _select: 1,
      id: 4,
      host_id: 9,
      host_address: '127.8.3.3',
      host_hostname: 'testhost2.testdomain.test',
      service_proto: null,
      service_port: null,
      service: '',
      via_target: null,
      name: 'test vulnerability',
      xtype: 'testxtype.124',
      severity: '',
      refs: [],
      tags: [],
      comment: '',
      created: '2023-07-17T20:01:09',
      modified: '2023-08-29T14:08:10',
      rescan_time: '2023-07-17T20:01:09',
      import_time: null,
      _buttons: 1,
    },
    {
      _select: 1,
      id: 347,
      host_id: 37,
      host_address: '127.128.129.130',
      host_hostname: 'serverz.localhost',
      service_proto: 'tcp',
      service_port: 443,
      service: '443/tcp',
      via_target: '127.128.129.130',
      name: 'PHP 5.6.x < 5.6.32 Multiple Vulnerabilities',
      xtype: 'nessus.104631',
      severity: 'critical',
      refs: [
        'CVE-2016-1283',
        'CVE-1900-0000',
        'CVE-2017-16642',
        'BID-79825',
        'BID-101745',
        'CERT-836068',
        'URL-http://www.php.net/ChangeLog-5.php#5.6.32',
        'MSF-Testcase metasploit module name',
        'NSS-104631',
        'EDB-ID-42956',
        'MSFT-MS17-013',
        'MSKB-4012598',
        'SN-1',
        'invalid-ref',
        '',
      ],
      tags: [],
      comment: null,
      created: '2023-08-03T13:14:01',
      modified: '2023-08-24T20:57:47',
      rescan_time: '2023-08-03T13:14:01',
      import_time: '2019-03-11T14:23:16',
      _buttons: 1,
    },
    {
      _select: 1,
      id: 389,
      host_id: 80,
      host_address: '127.123.123.123',
      host_hostname: null,
      service_proto: 'tcp',
      service_port: 80,
      service: '80/tcp',
      via_target: '127.123.123.123',
      name: 'Git Configuration - Detect',
      xtype: 'nuclei.git-config',
      severity: 'medium',
      refs: [],
      tags: [],
      comment: null,
      created: '2023-10-19T12:57:52',
      modified: '2023-10-19T12:57:52',
      rescan_time: '2023-10-19T12:57:52',
      import_time: '2023-07-19T20:07:31',
      _buttons: 1,
    },
  ],
}

export const vulnListHandler = rest.post('/backend/storage/vuln/list.json', (req, res, ctx) => {
  if (req.url.searchParams.get('filter') === 'Vuln.name=="aggregable vuln"') {
    return res(ctx.json({ draw: '1', recordsTotal: '1', recordsFiltered: '1', data: [data.data[0]] }))
  }

  return res(ctx.json(data))
})
