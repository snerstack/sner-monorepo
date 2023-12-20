interface PortDetails {
  port: number
  portname: string
  infos: { count: number; info: string }[]
  stats: { count: number; proto: string }[]
  hosts: { host_address: string; host_hostname: string; host_id: number }[]
  comments: { comment: string }[]
}

interface Internals {
  heatmap_check: boolean
  metrics: string
  exclusions: string
  planner: string
}
