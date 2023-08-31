import env from 'app-env'
import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSessionStorage } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { deleteRow, getColorForTag } from '@/lib/sner/storage'

import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DropdownButton from '@/components/Buttons/DropdownButton'
import EditButton from '@/components/Buttons/EditButton'
import TagButton from '@/components/Buttons/TagButton'
import TagsDropdownButton from '@/components/Buttons/TagsDropdownButton'
import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import AnnotateModal from '@/components/Modals/AnnotateModal'
import MultipleTagModal from '@/components/Modals/MultipleTagModal'

const HostListPage = () => {
  const [searchParams] = useSearchParams()
  const [toolboxesVisible] = useSessionStorage('dt_toolboxes_visible')
  const navigate = useNavigate()
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
    Column('address', {
      createdCell: (cell, data, row) =>
        renderElements(
          cell,
          <a
            href={`/storage/host/view/${row['id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['id']}`)
            }}
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
      createdCell: (cell, data, row) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotate({
                show: true,
                tags: data,
                comment: row['comment'],
                tableId: 'host_list_table',
                url: `/storage/host/annotate/${row['id']}`,
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
      createdCell: (cell, data, row) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotate({
                show: true,
                tags: row['tags'],
                comment: row['comment'],
                tableId: 'host_list_table',
                url: `/storage/host/annotate/${row['id']}`,
              })
            }
          >
            {row['comment']}
          </div>,
        ),
    }),
    ColumnButtons({
      createdCell: (cell, data, row) =>
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
            <DeleteButton url={`/storage/host/delete/${row['id']}`} />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
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
            <a
              className="btn btn-outline-secondary disabled"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'host_list_table',
                  url: '/storage/host/tag_multiid',
                })
              }
            >
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
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
              className="btn btn-outline-secondary abutton_selectnone"
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
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'host_list_table',
                  url: '/storage/host/tag_multiid',
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {env.VITE_HOST_TAGS.map((tag) => (
              <TagButton tag={tag} key={tag} url="/storage/host/tag_multiid" tableId="host_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary text-secondary"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'host_list_table',
                  url: '/storage/host/tag_multiid',
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
              <TagsDropdownButton tags={env.VITE_HOST_TAGS} url="/storage/host/tag_multiid" tableId="host_list_table" />
            </div>
            <a
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('host_list_table', '/storage/host/delete_multiid')}
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
          url:
            env.VITE_SERVER_URL +
            '/storage/host/list.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
        select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default HostListPage
