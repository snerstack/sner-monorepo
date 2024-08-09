import clsx from 'clsx'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, renderElements } from '@/lib/DataTables'
import { getServiceFilterInfo } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const ServiceGroupedPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const currentCrop = searchParams.get('crop')
  const noCropParams = new URLSearchParams(searchParams)
  noCropParams.delete('crop')
  const unfilterParams = new URLSearchParams(searchParams)
  unfilterParams.delete('filter')

  const columns = [
    Column('info', {
      createdCell: (cell, _data: string, row: ServiceRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/service/list?filter=${getServiceFilterInfo(row['info'])}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/service/list?filter=${getServiceFilterInfo(row['info'])}`)
            }}
          >
            {row['info'] ? (
              row['info']
            ) : (
              <>
                <em>null</em>
                <i className="fas fa-exclamation-circle text-warning"></i>
              </>
            )}
          </a>,
        ),
    }),
    Column('cnt_services'),
  ]

  return (
    <div>
      <Helmet>
        <title>Services / Grouped - SNER</title>
      </Helmet>
      <Heading headings={['Services', 'Grouped']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="service_grouped_table_toolbar" className="dt_toolbar">
        <div id="service_grouped_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">crop at:</a>
            {['1', '2', '3', '4', '5'].map((crop) => {
              const tmpLink = new URLSearchParams(searchParams)
              tmpLink.set('crop', crop)
              return (
                <Link
                  data-testid="grouped-crop-link"
                  className={clsx('btn btn-outline-secondary', currentCrop === crop && 'active')}
                  to={`/storage/service/grouped${toQueryString(tmpLink)}`}
                  key={crop}
                >
                  {crop}
                </Link>
              )
            })}

            <Link
              data-testid="grouped-crop-link"
              className={clsx('btn btn-outline-secondary', !currentCrop && 'active')}
              to={`/storage/service/grouped${toQueryString(noCropParams)}`}
            >
              no crop
            </Link>
          </div>
        </div>
        <FilterForm url={`/storage/service/grouped${toQueryString(unfilterParams)}`} />
      </div>

      <DataTable
        id="service_grouped_table"
        columns={columns}
        ajax={{
          url: urlFor(`/backend/storage/service/grouped.json${toQueryString(searchParams)}`),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
        order={[[1, 'desc']]}
      />
    </div>
  )
}
export default ServiceGroupedPage
