import { escapeHtml } from '@/utils'
import { toast } from 'react-toastify'

import { getLinksForService, linkForService } from '@/lib/sner/storage'

const clipboardCopyLink = (link: linkForService) => {
  const firstToken = link.value.split(" ")[0]

  return (
    <a
      key={link.value}
      className="mx-1"
      role="button"
      data-testid={`copy-${link.name}-to-clipboard-btn`}
      title={`Copy ${link.name}`}
      href={firstToken.includes("://") ? link.value : `command://${link.value}`}
      onClick={(e) => {
        e.preventDefault()
        void navigator.clipboard.writeText(link.value)
        toast.info('Copied to clipboard')
      }}
    >
      {link.name}
    </a>
  )
}

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
        <div className="dropdown-item">
          <span>{escapeHtml(address)}</span>
          <span>
            {getLinksForService(address, proto, port).map((link) => clipboardCopyLink(link))}
          </span>
        </div>

        {hostname &&
          <div className="dropdown-item">
            <span>{escapeHtml(hostname)}</span>
            <span>
              {getLinksForService(hostname, proto, port).map((link) => clipboardCopyLink(link))}
            </span>
          </div>
        }
      </div>
    </div>
  )
}

export default ServiceEndpointDropdown
