interface Host {
  id: number
  address: string
  hostname: string
  created: string
  modified: string
  rescan_time: string
  os: string
  tags: string[]
  comment: string
  servicesCount: number
  vulnsCount: number
  notesCount: number
}

interface Service {
  id: number
  host_id: number
  address: string
  hostname: string
  proto: string
  port: number
  state: string
  name: string
  info: string
  tags: string[]
  comment: string
}

interface Vuln {
  id: number
  host_id: number
  address: string
  hostname: string
  service_id: number
  service_proto: string
  service_port: number
  created: string
  modified: string
  rescan_time: string
  import_time: string
  via_target: string
  name: string
  xtype: string
  severity: string
  descr: string
  data: string
  refs: string[]
  tags: string[]
  comment: string
}

interface Note {
  id: number
  host_id: number
  address: string
  hostname: string
  service_id: number
  service_proto: string
  service_port: number
  via_target: string
  created: string
  modified: string
  import_time: string
  xtype: string
  data: string
  tags: string[]
  comment: string
}

interface Annotate {
  show: boolean
  tags: string[]
  comment: string
  tableId: string
  url: string
}

interface MultipleTag {
  show: boolean
  action: 'set' | 'unset'
  tableId: string
  url: string
}
