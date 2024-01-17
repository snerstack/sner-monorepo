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
          <span className="dropdown-item" key={link}>
            <i
              className="far fa-clipboard"
              data-testid="copy-to-clipboard-btn"
              title="Copy to clipboard"
              onClick={() => {
                void navigator.clipboard.writeText(link)
                toast.info('Copied to clipboard')
              }}
            ></i>{' '}
            <a rel="noreferrer" href={escapeHtml(link)}>
              {escapeHtml(link)}
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}

export default ServiceEndpointDropdown
