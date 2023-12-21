import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { encodeRFC3986URIComponent, getColorForTag } from '@/lib/sner/storage'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import ViewButton from '@/components/buttons/ViewButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

const VulnSearchListPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')
  const [annotate, setAnnotate] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })
  const [multipleTag, setMultipleTag] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const toolboxesVisible = sessionStorage.getItem('dt_toolboxes_visible') == 'true' ? true : false
  const viaTargetVisible = sessionStorage.getItem('dt_viatarget_column_visible') == 'true' ? true : false

  const columns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <a
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['host_id']}`)
            }}
            href={`/storage/host/view/${row['host_id']}`}
          >
            {data}
          </a>,
        ),
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <ServiceEndpointDropdown
            service={`${row['service_port']}/${row['service_proto']}`}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
        ),
    }),
    Column('via_target', {
      visible: viaTargetVisible,
    }),
    Column('cveid', {
      createdCell: (cell, data: string) => {
        renderElements(cell, <a href={`https://cve.circl.lu/cve/${data}`}>{data}</a>)
      },
    }),
    Column('cvss'),
    Column('cvss3'),
    Column('attack_vector'),
    Column('cpe_full'),
    Column('name'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VulnSearchRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vulnsearch_list_table',
            url: `/storage/vulnsearch/annotate/${row['id']}`,
          })
        }
        renderElements(
          cell,
          <div data-testid="vulnsearch_tags_annotate">
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
              </Fragment>
            ))}
          </div>,
        )
      },
    }),
    Column('comment', {
      className: 'abutton_annotate_dt forcewrap',
      title: 'cmnt',
      createdCell: (cell, _data: string, row: VulnSearchRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vulnsearch_list_table',
            url: `/storage/vulnsearch/annotate/${row['id']}`,
          })
        }
        renderElements(cell, <div data-testid="vulnsearch_comment_annotate">{row['comment']}</div>)
      },
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <ButtonGroup>
            <ViewButton url={`/storage/vulnsearch/view/${row['id']}`} navigate={navigate} />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Vulnsearch / List - sner4</title>
      </Helmet>

      <Heading headings={['Vulnsearch (pre-computed)']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="vulnsearch_list_table_toolbar" className="dt_toolbar">
        <div id="vulnsearch_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vulnsearch_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('vulnsearch_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vulnsearch_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('vulnsearch_list_table')
                dt.rows({ page: 'current' }).deselect()
              }}
            >
              None
            </a>
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_set_multiid"
              href="#"
              data-testid="vulnsearch_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'vulnsearch_list_table',
                  url: '/storage/vulnsearch/tag_multiid',
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {import.meta.env.VITE_VULNSEARCH_TAGS.split(',').map((tag) => (
              <TagButton tag={tag} key={tag} url="/storage/vulnsearch/tag_multiid" tableId="vulnsearch_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_unset_multiid"
              href="#"
              data-testid="vulnsearch_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'vulnsearch_list_table',
                  url: '/storage/vulnsearch/tag_multiid',
                })
              }
            >
              <i className="fas fa-eraser"></i>
            </a>
            <div className="btn-group">
              <a
                className="btn btn-outline-secondary dropdown-toggle"
                data-toggle="dropdown"
                href="#"
                title="remove tag dropdown"
              >
                <i className="fas fa-remove-format"></i>
              </a>
              <TagsDropdownButton
                tags={import.meta.env.VITE_VULNSEARCH_TAGS.split(',')}
                url="/storage/vulnsearch/tag_multiid"
                tableId="vulnsearch_list_table"
              />
            </div>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vulnsearch/list?filter=Vulnsearch.data astext_ilike "%exploit-db%"'
            >
              has_exploit
            </Link>
          </div>
        </div>

        <FilterForm url="/storage/vulnsearch/list" />
      </div>

      <DataTable
        id="vulnsearch_list_table"
        columns={columns}
        ajax={{
          url:
            import.meta.env.VITE_SERVER_URL +
            '/storage/vulnsearch/list.json' +
            (searchParams.has('filter') ? `?filter=${encodeRFC3986URIComponent(searchParams.get('filter')!)}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
        select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default VulnSearchListPage
