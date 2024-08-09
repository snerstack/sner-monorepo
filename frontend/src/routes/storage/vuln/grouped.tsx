import clsx from 'clsx'
import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, renderElements } from '@/lib/DataTables'
import { encodeRFC3986URIComponent, getColorForSeverity, getVulnFilterName } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import Tag from '@/components/Tag'

const VulnGroupedPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const columns = [
    Column('name', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/vuln/list?filter=${getVulnFilterName(row['name'])}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/vuln/list?filter=${getVulnFilterName(row['name'])}`)
            }}
          >
            {row['name']}
          </a>,
        ),
    }),
    Column('severity', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <span className={clsx('badge', getColorForSeverity(row['severity']))}>{row['severity']}</span>,
        ),
    }),
    Column('tags', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <>
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <Tag tag={tag} />{' '}
              </Fragment>
            ))}
          </>,
        ),
    }),
    Column('cnt_vulns'),
  ]

  return (
    <div>
      <Helmet>
        <title>Vulns / Grouped - SNER</title>
      </Helmet>
      <Heading headings={['Vulns', 'Grouped']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="vuln_grouped_table_toolbar" className="dt_toolbar">
        <div id="vuln_grouped_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link className="btn btn-outline-secondary" to='/storage/vuln/grouped?filter=Vuln.tags=="{}"'>
              Not tagged
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/vuln/grouped?filter=Vuln.tags!="{}"'>
              Tagged
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vuln/grouped?filter=Vuln.tags not_any "report" AND Vuln.tags not_any "report:data" AND Vuln.tags not_any "info"'
            >
              Exclude reviewed
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vuln/grouped?filter=Vuln.tags any "report" OR Vuln.tags any "report:data"'
            >
              Only Report
            </Link>
          </div>
        </div>
      </div>
      <FilterForm url="/storage/vuln/grouped" />

      <DataTable
        id="vuln_grouped_table"
        columns={columns}
        ajax={{
          url: urlFor(
            '/backend/storage/vuln/grouped.json' +
            (searchParams.has('filter') ? `?filter=${encodeRFC3986URIComponent(searchParams.get('filter')!)}` : ''),
          ),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />
    </div>
  )
}
export default VulnGroupedPage
