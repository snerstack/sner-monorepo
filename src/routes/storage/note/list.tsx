import { escapeHtml } from '@/utils'
import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie, useSessionStorage } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, renderElements } from '@/lib/DataTables'
import { deleteRow, getColorForTag, getLinksForService } from '@/lib/sner/storage'

import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DropdownButton from '@/components/Buttons/DropdownButton'
import EditButton from '@/components/Buttons/EditButton'
import TagButton from '@/components/Buttons/TagButton'
import TagsDropdownButton from '@/components/Buttons/TagsDropdownButton'
import ViewButton from '@/components/Buttons/ViewButton'
import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import AnnotateModal from '@/components/Modals/AnnotateModal'
import MultipleTagModal from '@/components/Modals/MultipleTagModal'

const NoteListPage = () => {
  const [searchParams] = useSearchParams()
  const [toolboxesVisible] = useSessionStorage('dt_toolboxes_visible', false)
  const [viaTargetVisible] = useSessionStorage('dt_viatarget_column_visible', false)
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

  const columns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, _data: string, row: NoteRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/host/view/${row['host_id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['host_id']}`)
            }}
          >
            {row['host_address']}
          </a>,
        ),
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: NoteRow) =>
        renderElements(
          cell,
          <div className="dropdown d-flex">
            <a className="flex-fill" data-toggle="dropdown">
              {row['service']}
            </a>
            <div className="dropdown-menu">
              <h6 className="dropdown-header">Service endpoint URIs</h6>
              {getLinksForService(
                row['host_address'],
                row['host_hostname'],
                row['service_proto'],
                row['service_port'],
              ).map((link) => (
                <span className="dropdown-item" key={link}>
                  <i className="far fa-clipboard" title="Copy to clipboard"></i>{' '}
                  <a rel="noreferrer" href={escapeHtml(link)}>
                    {escapeHtml(link)}
                  </a>
                </span>
              ))}
            </div>
          </div>,
        ),
    }),
    Column('via_target', { visible: viaTargetVisible }),
    Column('xtype'),
    Column('data', {
      className: 'forcewrap',
      render: (data: string) => {
        if (!data) return ''

        if (data.length >= 4096) {
          return data.substring(0, 4095) + '...'
        }

        return data
      },
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: NoteRow) =>
        renderElements(
          cell,
          <div
            data-testid="note_tags_annotate"
            onDoubleClick={() =>
              setAnnotate({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'note_list_table',
                url: `/storage/note/annotate/${row['id']}`,
              })
            }
          >
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
              </Fragment>
            ))}
          </div>,
        ),
    }),
    Column('comment', {
      className: 'abutton_annotate_dt forcewrap',
      title: 'cmnt',
      createdCell: (cell, _data: string, row: NoteRow) =>
        renderElements(
          cell,
          <div
            data-testid="note_comment_annotate"
            onDoubleClick={() =>
              setAnnotate({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'note_list_table',
                url: `/storage/note/annotate/${row['id']}`,
              })
            }
          >
            {row['comment']}
          </div>,
        ),
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: NoteRow) =>
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
                  name: 'import_time',
                  data: row['import_time'] || '',
                },
              ]}
            />
            <ViewButton url={`/storage/note/view/${row['id']}`} navigate={navigate} />
            <EditButton url={`/storage/note/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={`/storage/note/delete/${row['id']}`} />
          </ButtonGroup>,
        ),
    }),
  ]
  return (
    <div>
      <Helmet>
        <title>Notes / List - sner4</title>
      </Helmet>

      <Heading headings={['Notes']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="note_list_table_toolbar" className="dt_toolbar">
        <div id="note_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-check-square"></i>
            </a>
            <a className="btn btn-outline-secondary abutton_selectall" href="#" title="select all">
              All
            </a>
            <a className="btn btn-outline-secondary abutton_selectnone" href="#" title="unselect all">
              None
            </a>
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_set_multiid"
              href="#"
              data-testid="note_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'note_list_table',
                  url: '/storage/note/tag_multiid',
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {import.meta.env.VITE_NOTE_TAGS.split(',').map((tag) => (
              <TagButton tag={tag} key={tag} url="/storage/note/tag_multiid" tableId="note_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_unset_multiid"
              href="#"
              data-testid="note_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'note_list_table',
                  url: '/storage/note/tag_multiid',
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
                tags={import.meta.env.VITE_NOTE_TAGS.split(',')}
                url="/storage/note/tag_multiid"
                tableId="note_list_table"
              />
            </div>
            <a
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('note_list_table', '/storage/note/delete_multiid')}
            >
              <i className="fas fa-trash text-danger"></i>
            </a>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link className="btn btn-outline-secondary" to='/storage/note/list?filter=Note.tags not_any "reviewed"'>
              Exclude reviewed
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/note/list?filter=Note.tags any "todo"'>
              Only Todo
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/note/list?filter=Note.xtype not_ilike "nessus%"'>
              Not nessus
            </Link>
          </div>
        </div>
        <FilterForm url="/storage/note/list" />
      </div>

      <DataTable
        id="note_list_table"
        columns={columns}
        ajax={{
          url:
            import.meta.env.VITE_SERVER_URL +
            '/storage/note/list.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
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
export default NoteListPage
