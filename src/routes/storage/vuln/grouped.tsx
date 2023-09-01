import env from 'app-env'
import clsx from 'clsx'
import { Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { getColorForSeverity, getColorForTag, getVulnFilterName } from '@/lib/sner/storage'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const VulnGroupedPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

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
                <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
              </Fragment>
            ))}
          </>,
        ),
    }),
    Column('cnt_vulns'),
  ]

  return (
    <div>
      <Heading headings={['Vulns', 'Grouped']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
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
            <a className="btn btn-outline-secondary" href='/storage/vuln/grouped?filter=Vuln.tags=="{}"'>
              Not tagged
            </a>
            <a className="btn btn-outline-secondary" href='/storage/vuln/grouped?filter=Vuln.tags!="{}"'>
              Tagged
            </a>
            <a
              className="btn btn-outline-secondary"
              href='/storage/vuln/grouped?filter=Vuln.tags not_any "report" AND Vuln.tags not_any "report:data" AND Vuln.tags not_any "info"'
            >
              Exclude reviewed
            </a>
            <a
              className="btn btn-outline-secondary"
              href='/storage/vuln/grouped?filter=Vuln.tags any "report" OR Vuln.tags any "report:data"'
            >
              Only Report
            </a>
          </div>
        </div>
      </div>
      <FilterForm url="/storage/vuln/grouped" />

      <DataTable
        columns={columns}
        ajax={{
          url:
            env.VITE_SERVER_URL +
            '/storage/vuln/grouped.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
      />
    </div>
  )
}
export default VulnGroupedPage
