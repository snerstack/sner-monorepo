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
  url: string
  tableId?: string
  refresh?: (tags: string[], comment: string) => void
}

interface MultipleTag {
  show: boolean
  action: 'set' | 'unset'
  url: string
  tableId: string
}

interface TagConfig {
  show: boolean
  tag: string
  color: string
}

interface HostRow {
  id: number
  address: string
  hostname: string | null
  os: string | null
  cnt_s: number
  cnt_v: number
  cnt_n: number
  tags: string[]
  comment: string | null
  created: string
  modified: string
  rescan_time: string
}

interface ServiceRow {
  id: number
  host_id: number
  host_address: string
  host_hostname: string
  proto: string
  port: number
  name: string | null
  info: string | null
  tags: string[]
  comment: string | null
  created: string
  modified: string
  rescan_time: string
  import_time: string | null
}

interface VulnRow {
  id: number
  host_id: number
  host_address: string
  host_hostname: string
  service: string
  service_port: number | null
  service_proto: string | null
  via_target: string | null
  name: string
  xtype: string | null
  severity: string
  refs: string[]
  tags: string[]
  comment: string | null
  created: string
  modified: string
  rescan_time: string
  import_time: string | null
}

interface VulnMulticopyRow {
  endpoint_id: { host_id: number; service_id?: number }
  host_address: string
  host_hostname: string
  service_info: string | null
  service_proto: string | null
  service_port: number | null
}

interface NoteRow {
  id: number
  host_id: number
  host_address: string
  host_hostname: string
  service: string
  service_port: number | null
  service_proto: string | null
  via_target: string | null
  xtype: string | null
  data: string | null
  tags: string[]
  comment: string | null
  created: string
  modified: string
  import_time: string | null
}

interface VersionInfoRow {
  id: string
  host_id: number
  host_address: string
  host_hostname: string
  service_proto: string | null
  service_port: number | null
  service: string
  via_target: string | null
  product: string
  version: string
  extra: string
  tags: string[]
  comment: string | null
}

interface QuickJumpSuggestions {
  hosts: { label: string; host_id: number }[]
  services: { label: string; port: number }[]
}
