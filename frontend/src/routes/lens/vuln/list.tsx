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
import { Field } from 'react-querybuilder'
import RBQFilter from '@/components/RBQFilter'

const LensVulnListPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const dtColumns = [
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      title: "Address",
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
    Column('host_hostname', { title: "Hostname" }),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      title: "Service",
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
      title: "Name",
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
      title: "Severity",
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <span className={clsx('badge', getColorForSeverity(row['severity']))}>{row['severity']}</span>,
        ),
    }),
    Column('refs', {
      title: "Refs",
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <>
            {row['refs'].map((ref, index) => (
              <Fragment key={index}>
                <a rel="noreferrer" href={getUrlForRef(ref)}>
                  {getTextForRef(ref)}
                </a>{' '}
              </Fragment>
            ))}
          </>,
        ),
    }),
    Column('tags', {
      title: "Tags",
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
      { name: "Host.address", label: "Address" },
      { name: "Host.hostname", label: "Hostname" },
      { name: "Service.proto", label: "Proto" },
      { name: "Service.port", label: "Port" },
      { name: "Vuln.name", label: "Name" },
      { name: "Vuln.severity", label: "Severity" },
      { name: "Vuln.refs", label: "Refs[]" },
      { name: "Vuln.tags", label: "Tags[]" },
  ]

  return (
    <div>
      <Helmet>
        <title>Lens / Vulns / List - SNER</title>
      </Helmet>

      <Heading headings={['Lens', 'Vulns']}>
        <div className="breadcrumb-buttons pl-2">
          <a
            className="btn btn-outline-secondary"
            href={`?jsonfilter=${JSON.stringify({combinator: "and", rules: [{field: "Vuln.severity", operator: ">=", value: "medium"}]})}`}
          >
            <i className="fas fa-greater-than-equal"></i> medium
          </a>
        </div>
      </Heading>

      <RBQFilter fields={rbqFields} />

      <DataTable
        id="vuln_list_table"
        columns={dtColumns}
        ajax_url={urlFor(`/backend/lens/vuln/list.json${toQueryString(searchParams)}`)}
        order={[[1, 'asc']]}
      />

    </div>
  )
}
export default LensVulnListPage
