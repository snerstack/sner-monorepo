import { Api } from 'datatables.net-bs4'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import { httpClient } from '@/lib/httpClient'

export const getColorForSeverity = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'badge-danger'
    case 'high':
      return 'badge-warning'
    case 'medium':
      return 'badge-primary'
    case 'low':
      return 'badge-info'
    case 'info':
      return 'badge-light'
    default:
      return 'badge-secondary'
  }
}

export const getUrlForRef = (ref: string): string => {
  const matched = ref.match(/(.*?)-(.*)/)

  if (matched === null || matched.length < 3) return '#'

  const type = matched[1]
  const id = matched[2]

  switch (type) {
    case 'URL':
      return (id.startsWith('http://') || id.startsWith('https://') ? id : `#invalidurl#${id}`)
    case 'CVE':
      return 'https://cvedetails.com/cve/CVE-' + id
    case 'NSS':
      return 'https://www.tenable.com/plugins/nessus/' + id
    case 'BID':
      return 'https://www.securityfocus.com/bid/' + id
    case 'CERT':
      return 'https://www.kb.cert.org/vuls/id/' + id
    case 'EDB':
      return 'https://www.exploit-db.com/exploits/' + id.replace('ID-', '')
    case 'MSF':
      return 'https://www.rapid7.com/db/?q=' + id
    case 'MSFT':
      return 'https://technet.microsoft.com/en-us/security/bulletin/' + id
    case 'MSKB':
      return 'https://support.microsoft.com/en-us/help/' + id
    case 'SN':
      return '/storage/note/view/' + id
    case 'SV':
      return '/storage/vuln/view/' + id
    default:
      return '#'
  }
}

export const getTextForRef = (ref: string): string => {
  if (ref.startsWith('URL-')) {
    return 'URL'
  }
  if (ref.startsWith('MSF-')) {
    return 'MSF'
  }
  return ref
}

export interface linkForService {
  name: string
  value: string
}

export const getLinksForService = (
  address: string,
  serviceProto: string | null,
  servicePort: string | number | null,
  hostname: string | null = null,
): linkForService[] => {
  if (serviceProto === null || servicePort === null) {
    return []
  }

  const links = []
  const hostIdent = hostname ?? address
  const isIpv6 = address.includes(':')
  const formattedHostAddress = isIpv6 ? '[' + hostIdent + ']' : hostIdent

  if (hostname) {
    links.push({"name": "svcTgt", "value": `named,${address},proto=${serviceProto},port=${servicePort},hostname=${hostname}`})
  } else {
    links.push({"name": "svcTgt", "value": `svc,${address},proto=${serviceProto},port=${servicePort}`})
  }
  links.push({"name": "ident", "value": `${hostIdent} ${servicePort}`})
  links.push({"name": "http", "value": `http://${formattedHostAddress}:${servicePort}`})
  links.push({"name": "https", "value": `https://${formattedHostAddress}:${servicePort}`})

  return links
}

export const encodeRFC3986URIComponent = (str: string): string => {
  const reservedChars = /[!'()*]/g
  return encodeURIComponent(str).replace(reservedChars, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

export const getServiceFilterInfo = (info: string | null): string => {
  if (info == null) {
    return 'Service.info is_null ""'
  } else {
    return 'Service.info ilike ' + encodeRFC3986URIComponent(JSON.stringify(info.replace(/\\/g, '\\\\') + '%'))
  }
}

export const getVulnFilterName = (name: string): string => {
  return 'Vuln.name==' + encodeRFC3986URIComponent(JSON.stringify(name))
}

export const getNoteFilterXtype = (xtype: string): string => {
  return 'Note.xtype==' + encodeRFC3986URIComponent(JSON.stringify(xtype))
}

export const getSelectedIds = (dt: Api<unknown>): number[] => {
  const ids: number[] = []
  dt.rows({ selected: true })
    .data()
    .each((item: { id: number }) => {
      ids.push(item['id'])
    })

  return ids
}

export const tagAction = async ({
  ids,
  tag,
  url,
  action,
}: {
  ids: number[]
  tag: string
  url: string
  action: string
}) => {
  if (ids.length === 0) {
    toast.warn('No items selected')
    return
  }

  const payload = {
    ids,
    tags: [tag],
    action,
  }

  await httpClient.post(url, payload).catch(() => toast.error('Error while adding a tag'))
}

export const deleteRow = (tableId: string, url: string) => {
  if (!confirm('Really delete?')) return

  const api = getTableApi(tableId)

  const ids = getSelectedIds(api)

  if (!ids.length) {
    toast.warn('No items selected')
    return
  }

  httpClient
    .post(url, { ids })
    .then(() => api.draw())
    .catch(() => toast.error('Error while deleting a row'))
}

export const getDTConfigValue = (storageKey: string) => {
  return sessionStorage.getItem(storageKey) === 'true'
}

export const DEFAULT_ANNOTATE_STATE: Annotate = {
  show: false,
  tags: [],
  comment: '',
  url: '',
}

export const DEFAULT_MULTIPLE_TAG_STATE: MultipleTag = {
  show: false,
  action: 'set',
  url: '',
  tableId: '',
}
