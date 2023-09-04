import env from 'app-env'
import { Api } from 'datatables.net-bs4'
import { toast } from 'react-toastify'

import { getTableApi } from '../DataTables'
import httpClient from '../httpClient'

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
      return id
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

export const getColorForTag = (tag: string): string => {
  switch (tag) {
    case 'todo':
      return 'badge-warning'
    case 'report':
      return 'badge-danger'
    case 'report:data':
      return 'badge-danger'

    default:
      return 'badge-secondary'
  }
}

export const getLinksForService = (
  hostAddress: string,
  hostHostname: string | null,
  serviceProto: string | null,
  servicePort: string | number | null,
): string[] => {
  const urls = []

  if (serviceProto !== null && servicePort !== null) {
    urls.push(serviceProto + '://' + hostAddress + ':' + servicePort)
    if (hostHostname !== null) {
      urls.push(serviceProto + '://' + hostHostname + ':' + servicePort)
    }

    if (serviceProto === 'tcp') {
      urls.push('http://' + hostAddress + ':' + servicePort)
      urls.push('https://' + hostAddress + ':' + servicePort)
      if (hostHostname !== null) {
        urls.push('http://' + hostHostname + ':' + servicePort)
        urls.push('https://' + hostHostname + ':' + servicePort)
      }
    }
  }

  return urls
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

export const getSelectedIdsFormData = (dt: Api<unknown>): { [key: string]: number } => {
  const data: { [key: string]: number } = {}
  let i = 0
  dt.rows({ selected: true })
    .data()
    .each((item: { id: number }) => {
      data['ids-' + i] = item['id']
      i++
    })

  return data
}

export const tagAction = ({
  ids,
  tag,
  url,
  action,
}: {
  ids: { [key: string]: number }
  tag: string
  url: string
  action: string
}) => {
  if (!Object.values(ids).length) {
    toast.warn('No items selected')
    return
  }

  const formData = new FormData()

  formData.append('tag', tag)
  formData.append('action', action)

  for (const key in ids) {
    formData.append(key, ids[key].toString())
  }

  httpClient.post(env.VITE_SERVER_URL + url, formData).catch(() => toast.error('Error while adding a tag'))
}

export const deleteRow = (tableId: string, url: string) => {
  if (!confirm('Really delete?')) return

  const api = getTableApi(tableId)

  const ids = getSelectedIdsFormData(api)

  if (!Object.values(ids).length) {
    toast.warn('No items selected')
    return
  }

  const formData = new FormData()

  for (const key in ids) {
    formData.append(key, ids[key].toString())
  }

  httpClient
    .post(env.VITE_SERVER_URL + url, formData)
    .then(() => api.draw())
    .catch(() => toast.error('Error while deleting a row'))
}
