import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { deleteRow, getColorForTag } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import Button from '@/components/buttons/Button'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

const HostListPage = () => {
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

  const columns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('address', {
      createdCell: (cell, data: string, row: HostRow) =>
        renderElements(
          cell,
          <a
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['id']}`)
            }}
            href={`/storage/host/view/${row['id']}`}
          >
            {data}
          </a>,
        ),
    }),
    Column('hostname'),
    Column('os'),
    Column('cnt_s'),
    Column('cnt_v'),
    Column('cnt_n'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, data: string[], row: HostRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: data,
            comment: row['comment'] || '',
            tableId: 'host_list_table',
            url: urlFor(`/backend/storage/host/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="host_tags_annotate">
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
      createdCell: (cell, _data: string, row: HostRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_list_table',
            url: urlFor(`/backend/storage/host/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="host_comment_annotate">{row['comment']}</div>)
      },
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: HostRow) =>
        renderElements(
          cell,
          <ButtonGroup>
            <DropdownButton
              title="More data"
              options={[
                {
                  name: 'created',
                  data: row['created'],
                },
                {
                  name: 'modified',
                  data: row['modified'],
                },
                {
                  name: 'rescan_time',
                  data: row['rescan_time'],
                },
              ]}
            />
            <Button name="+S" title="Add service" url={`/storage/service/add/${row['id']}`} navigate={navigate} />
            <Button name="+V" title="Add vuln" url={`/storage/vuln/add/host/${row['id']}`} navigate={navigate} />
            <Button name="+N" title="Add note" url={`/storage/note/add/host/${row['id']}`} navigate={navigate} />
            <EditButton url={`/storage/host/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={urlFor(`/backend/storage/host/delete/${row['id']}`)} tableId="host_list_table" />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Hosts / List - sner4</title>
      </Helmet>

      <Heading headings={['Hosts']}>
        <div className="breadcrumb-buttons pl-2">
          <Link className="btn btn-outline-primary" to="/storage/host/add">
            Add
          </Link>{' '}
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="host_list_table_toolbar" className="dt_toolbar">
        <div id="host_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="host_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('host_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="host_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('host_list_table')
                dt.rows({ page: 'current' }).deselect()
              }}
            >
              None
            </a>
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary"
              href="#"
              data-testid="host_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'host_list_table',
                  url: urlFor('/backend/storage/host/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {import.meta.env.VITE_HOST_TAGS.split(',').map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor('/backend/storage/host/tag_multiid')} tableId="host_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary text-secondary"
              data-testid="host_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'host_list_table',
                  url: urlFor('/backend/storage/host/tag_multiid'),
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
                tags={import.meta.env.VITE_HOST_TAGS.split(',')}
                url={urlFor('/backend/storage/host/tag_multiid')}
                tableId="host_list_table"
              />
            </div>
            <a
              data-testid="delete-row-btn"
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('host_list_table', urlFor('/backend/storage/host/delete_multiid'))}
            >
              <i className="fas fa-trash text-danger"></i>
            </a>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link className="btn btn-outline-secondary" to='/storage/host/list?filter=Host.tags+not_any+"reviewed"'>
              Exclude reviewed
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/host/list?filter=Host.tags+any+"todo"'>
              Only Todo
            </Link>
          </div>
        </div>
        <FilterForm url="/storage/host/list" />
      </div>

      <DataTable
        id="host_list_table"
        columns={columns}
        ajax={{
          url: urlFor(
            '/backend/storage/host/list.json' +
            (searchParams.toString() ? `?${searchParams.toString()}` : ''),
          ),
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
export default HostListPage
