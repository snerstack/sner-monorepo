import { rest } from 'msw'

const data = {
  data: [
    {
      _buttons: 1,
      active: true,
      config: 'module: six_dns_discover\ndelay: 1\n',
      group_size: 1000,
      id: 1,
      name: 'sner.six_dns_discover',
      nr_jobs: 5,
      nr_targets: 9,
      priority: 10,
      reqs: [],
    },
    {
      _buttons: 1,
      active: true,
      config: 'module: jarm\ndelay: 1\n',
      group_size: 50,
      id: 7,
      name: 'sner.jarm',
      nr_jobs: 22,
      nr_targets: 0,
      priority: 15,
      reqs: [],
    },
    {
      _buttons: 1,
      active: true,
      config:
        'module: nmap\nargs: -sS -A -p1-65535 -Pn  --max-retries 3 --script-timeout 10m --min-hostgroup 20\n    --min-rate 900 --max-rate 1500\n',
      group_size: 20,
      id: 9,
      name: 'pentest.nmap.fullsynscan',
      nr_jobs: 0,
      nr_targets: 0,
      priority: 10,
      reqs: [],
    },
  ],
  draw: '1',
  recordsFiltered: '3',
  recordsTotal: '3',
}

export const queueListHandler = rest.post('http://localhost:18000/scheduler/queue/list.json', (_, res, ctx) => {
  return res(ctx.json(data))
})
