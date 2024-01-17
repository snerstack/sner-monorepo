interface Queue {
  id: number
  name: string
  config: string
  priority: number
  group_size: number
  active: boolean
  reqs: string[]
}

interface QueryRow {
  id: number
  name: string
  config: string
  active: boolean
  group_size: number
  nr_jobs: number
  nr_targets: number
  priority: number
}

interface JobRow {
  id: string
  assignment: string
  queue_name: string
  retval: number
  time_start: string
  time_end: string
  time_taken: string
}
