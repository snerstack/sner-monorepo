import clsx from 'clsx'
import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { getColorForSeverity, getTextForRef, getUrlForRef } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import DataTableLink from '@/components/DataTableLink'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'

const LensVulnListPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const columns = [
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, data: string, row: VulnRow) =>
        renderElements(
          cell,
          <DataTableLink
            url={`/lens/host/view/${row['host_id']}`}
            navigate={navigate}
          >
            {data}
          </DataTableLink>
        ),
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <ServiceEndpointDropdown
            service={row['service']}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
        ),
    }),
    Column('via_target', { visible: false, }),
    Column('name', {
      createdCell: (cell, data: string, row: VulnRow) =>
        renderElements(
          cell,
          <DataTableLink
            url={`/lens/host/view/${row['host_id']}#vuln-${row['id']}`}
            navigate={navigate}
          >
            {data}
          </DataTableLink>
        ),
    }),
    Column('xtype', { visible: false }),
    Column('severity', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <span className={clsx('badge', getColorForSeverity(row['severity']))}>{row['severity']}</span>,
        ),
    }),
    Column('refs', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <>
            {row['refs'].map((ref) => (
              <Fragment key={ref}>
                <a rel="noreferrer" href={getUrlForRef(ref)}>
                  {getTextForRef(ref)}
                </a>{' '}
              </Fragment>
            ))}
          </>,
        ),
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VulnRow) => {
        renderElements(
          cell,
          <div data-testid="vuln_tags_annotate">
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <Tag tag={tag} />{' '}
              </Fragment>
            ))}
          </div>,
        )
      },
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Lens / Vulns / List - SNER</title>
      </Helmet>

      <Heading headings={['Lens', 'Vulns']} />

      <DataTable
        id="vuln_list_table"
        columns={columns}
        ajax_url={urlFor(`/backend/lens/vuln/list.json${toQueryString(searchParams)}`)}
        order={[[1, 'asc']]}
      />

    </div>
  )
}
export default LensVulnListPage
