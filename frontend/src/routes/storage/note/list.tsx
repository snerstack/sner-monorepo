import { escapeHtml } from '@/utils'
import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { DEFAULT_ANNOTATE_STATE, DEFAULT_MULTIPLE_TAG_STATE, deleteRow, toolboxesVisible, viaTargetVisible } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import ViewButton from '@/components/buttons/ViewButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

const NoteListPage = () => {
  const [appConfig,] = useRecoilState(appConfigState)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)
  const [multipleTag, setMultipleTag] = useState<MultipleTag>(DEFAULT_MULTIPLE_TAG_STATE)

  const columns = [
    ColumnSelect({ visible: toolboxesVisible() }),
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
          <ServiceEndpointDropdown
            service={row['service']}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
        ),
    }),
    Column('via_target', { visible: viaTargetVisible() }),
    Column('xtype'),
    Column('data', {
      className: 'forcewrap',
      render: (data: string) => {
        if (!data) return ''

        if (data.length >= 4096) {
          return data.substring(0, 4095) + '...'
        }

        return escapeHtml(data)
      },
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: NoteRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'note_list_table',
            url: urlFor(`/backend/storage/note/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="note_tags_annotate">
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <Tag tag={tag} />{' '}
              </Fragment>
            ))}
          </div>,
        )
      },
    }),
    Column('comment', {
      className: 'abutton_annotate_dt forcewrap',
      title: 'cmnt',
      createdCell: (cell, _data: string, row: NoteRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'note_list_table',
            url: urlFor(`/backend/storage/note/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="note_comment_annotate">{row['comment']}</div>)
      },
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
            <DeleteButton url={urlFor(`/backend/storage/note/delete/${row['id']}`)} tableId="note_list_table" />
          </ButtonGroup>,
        ),
    }),
  ]
  return (
    <div>
      <Helmet>
        <title>Notes / List - SNER</title>
      </Helmet>

      <Heading headings={['Notes']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="note_list_table_toolbar" className="dt_toolbar">
        <div data-testid="note_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible() && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="note_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('note_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="note_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('note_list_table')
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
              data-testid="note_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'note_list_table',
                  url: urlFor('/backend/storage/note/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {appConfig.tags.note.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/note/tag_multiid")} tableId="note_list_table" />
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
                  url: urlFor('/backend/storage/note/tag_multiid'),
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
              <TagsDropdownButton tags={appConfig.tags.note} url={urlFor("/backend/storage/note/tag_multiid")} tableId="note_list_table" />
            </div>
            <a
              data-testid="delete-row-btn"
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('note_list_table', urlFor('/backend/storage/note/delete_multiid'))}
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
        ajax_url={urlFor(`/backend/storage/note/list.json${toQueryString(searchParams)}`)}
        select={toolboxesVisible() ? { style: 'multi', selector: 'td:first-child' } : false}
        order={[[3, 'asc']]}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default NoteListPage
