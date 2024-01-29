import { escapeHtml } from '@/utils'
import { toast } from 'react-toastify'

import { getLinksForService } from '@/lib/sner/storage'

const ServiceEndpointDropdown = ({
  service,
  address,
  hostname,
  proto,
  port,
}: {
  service: string
  address: string
  hostname: string
  proto: string | null
  port: number | null
}) => {
  return (
    <div className="dropdown d-flex">
      <a className="flex-fill" data-toggle="dropdown" data-testid="service_link">
        {service}
      </a>
      <div className="dropdown-menu">
        <h6 className="dropdown-header">Service endpoint URIs</h6>
        {getLinksForService(address, hostname, proto, port).map((link) => (
          <span className="dropdown-item" key={link.raw}>
            <i
              className="far fa-clipboard mr-1"
              role="button"
              data-testid="copy-link-to-clipboard-btn"
              title="Copy link"
              onClick={() => {
                void navigator.clipboard.writeText(link.raw)
                toast.info('Link copied to clipboard')
              }}
            ></i>
            <a
              className="mx-1"
              role="button"
              data-testid="copy-telnet-to-clipboard-btn"
              title="Copy telnet"
              onClick={() => {
                void navigator.clipboard.writeText(link.telnet)
                toast.info('Telnet copied to clipboard')
              }}
            >
              TEL
            </a>
            <a
              className="mr-1"
              role="button"
              data-testid="copy-curl-to-clipboard-btn"
              title="Copy curl"
              onClick={() => {
                void navigator.clipboard.writeText(link.curl)
                toast.info('Curl copied to clipboard')
              }}
            >
              CURL
            </a>
            <span className="user-select-none mr-1">|</span>
            <a rel="noreferrer" href={escapeHtml(link.raw)}>
              {escapeHtml(link.raw)}
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}

export default ServiceEndpointDropdown
