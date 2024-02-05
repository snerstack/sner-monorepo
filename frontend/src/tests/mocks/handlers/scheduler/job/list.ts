import { rest } from 'msw'

const data = {
  draw: '1',
  recordsTotal: '262',
  recordsFiltered: '262',
  data: [
    {
      id: 'a1a54d27-e23d-47f8-b426-5f36908c097c',
      queue_name: 'sner.nmap.servicedisco',
      assignment:
        '{"id": "a1a54d27-e23d-47f8-b426-5f36908c097c", "config": {"module": "nmap", "args": "-sS --top-ports 10000 -Pn --scanflags ECESYN", "timing_perhost": 2}, "targets": ["127.2.2.2"]}',
      retval: -2,
      time_start: '2023-08-03T11:00:05',
      time_end: '2023-08-03T11:01:58',
      time_taken: '0:01:52.539258',
      _buttons: 1,
    },
    {
      id: 'a1d4b69b-50ad-4bd4-8d19-acb794e7c490',
      queue_name: 'nuclei.test',
      assignment:
        '{"id": "a1d4b69b-50ad-4bd4-8d19-acb794e7c490", "config": {"module": "nuclei", "args": "-es info -pt http"}, "targets": ["http://127.123.123.123/DVWA/"]}',
      retval: 0,
      time_start: '2023-07-19T18:06:42',
      time_end: '2023-07-19T18:07:48',
      time_taken: '0:01:06.203846',
      _buttons: 1,
    },
    {
      id: 'afa232a8-dc06-47af-8298-3b55aad48aed',
      queue_name: 'sner.jarm',
      assignment: '{"id": "afa232a8", "config": {"module": "jarm", "delay": 1}, "targets": ["tcp://google.com:443"]}',
      retval: 0,
      time_start: '2023-08-03T08:14:12',
      time_end: '2023-08-03T08:14:13',
      time_taken: '0:00:01.556558',
      _buttons: 1,
    },
  ],
}

export const jobListHandler = rest.post('http://localhost:18000/scheduler/job/list.json', (_, res, ctx) => {
  return res(ctx.json(data))
})
