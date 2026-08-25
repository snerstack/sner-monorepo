import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { Field } from 'react-querybuilder'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import DataTableLink from '@/components/DataTableLink'
import Heading from '@/components/Heading'
import RBQFilter from '@/components/RBQFilter'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'

const LensVersioninfoListPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const dtColumns = [
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      title: 'Address',
      createdCell: (cell, data: string, row: VulnRow) =>
        renderElements(
          cell,
          <DataTableLink url={`/lens/host/view/${row['host_id']}`} navigate={navigate}>
            {data}
          </DataTableLink>,
        ),
    }),
    Column('host_hostname', { title: 'Hostname' }),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      title: 'Service',
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
    Column('via_target', { visible: false }),
    Column('product', { title: 'Product' }),
    Column('version', { title: 'Version' }),
    Column('extra', { title: 'Extra' }),
    Column('tags', {
      title: 'Tags',
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

  const rbqFields: Field[] = [
    { name: 'Versioninfo.host_address', label: 'Address' },
    { name: 'Versioninfo.host_hostname', label: 'Hostname' },
    { name: 'Versioninfo.service_proto', label: 'Proto' },
    { name: 'Versioninfo.service_port', label: 'Port' },
    { name: 'Versioninfo.product', label: 'Product' },
    { name: 'Versioninfo.version', label: 'Version' },
    { name: 'Versioninfo.extra', label: 'Extra{}' },
    { name: 'Versioninfo.tags', label: 'Tags[]' },
  ]

  return (
    <div>
      <Helmet>
        <title>Lens / Versioninfo / List - SNER</title>
      </Helmet>

      <Heading headings={['Lens', 'Versioninfo']}></Heading>

      <RBQFilter fields={rbqFields} />

      <DataTable
        id="vuln_list_table"
        columns={dtColumns}
        ajax_url={urlFor(`/backend/lens/versioninfo/list.json${toQueryString(searchParams)}`)}
        order={[[1, 'asc']]}
      />
    </div>
  )
}
export default LensVersioninfoListPage
