import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, renderElements } from '@/lib/DataTables'
import { encodeRFC3986URIComponent, getNoteFilterXtype } from '@/lib/sner/storage'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const NoteGroupedPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const columns = [
    Column('xtype', {
      createdCell: (cell, _data: string, row: NoteRow) =>
        renderElements(
          cell,
          <>
            {row['xtype'] && (
              <a
                href={`/storage/note/list?filter=${getNoteFilterXtype(row['xtype']!)}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/storage/note/list?filter=${getNoteFilterXtype(row['xtype']!)}`)
                }}
              >
                {row['xtype']}
              </a>
            )}
          </>,
        ),
    }),
    Column('cnt_notes'),
  ]

  return (
    <div>
      <Helmet>
        <title>Notes / Grouped - sner4</title>
      </Helmet>
      <Heading headings={['Notes', 'Grouped']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <FilterForm url="/storage/note/grouped" />

      <DataTable
        id="note_grouped_table"
        columns={columns}
        ajax={{
          url:
            import.meta.env.VITE_SERVER_URL +
            '/storage/note/grouped.json' +
            (searchParams.has('filter') ? `?filter=${encodeRFC3986URIComponent(searchParams.get('filter')!)}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />
    </div>
  )
}
export default NoteGroupedPage
