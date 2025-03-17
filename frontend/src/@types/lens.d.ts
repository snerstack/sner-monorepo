
interface LensService {
  id: number
  port: number
  proto: string
  state: string
  info: string

  tags: string[]
  comment: string

  _notes_ids: number[]
  _vulns_ids: number[]
}

interface LensNote {
  id: number
  host_id: number
  service_id: number
  xtype: string;
  data: string;

  tags: string[]
  comment: string
}

interface LensVuln {
  id: number
  host_id: number
  service_id: number
  via_target: string
  name: string
  xtype: string
  severity: string
  descr: string
  data: string
  refs: string[]

  tags: string[]
  comment: string

  _service_ident: string
}

interface LensHost {
  id: number
  address: string
  hostname: string
  os: string

  tags: string[]
  comment: string
  created: string
  modified: string
  rescan_time: string

  services: LensService[]
  notes: LensNote[]
  vulns: LensVuln[]
}
