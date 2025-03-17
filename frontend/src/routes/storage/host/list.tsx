import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { DEFAULT_ANNOTATE_STATE, DEFAULT_MULTIPLE_TAG_STATE, deleteRow, toolboxesVisible } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import { Button, EditButton, LensButton } from '@/components/buttons/BasicButtons'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import DataTable from '@/components/DataTable'
import DataTableLink from '@/components/DataTableLink'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'
import Tag from '@/components/Tag'

const HostListPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)
  const [multipleTag, setMultipleTag] = useState<MultipleTag>(DEFAULT_MULTIPLE_TAG_STATE)

  const columns = [
    ColumnSelect({ visible: toolboxesVisible() }),
    Column('id', { visible: false }),
    Column('address', {
      createdCell: (cell, data: string, row: HostRow) =>
        renderElements(
          cell,
          <DataTableLink url={`/storage/host/view/${row['id']}`} navigate={navigate}>
            {data}
          </DataTableLink>
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
            <LensButton url={`/lens/host/view/${row['id']}`} title="Jump to host lens" navigate={navigate} />
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
            <Button title="Add service" url={`/storage/service/add/${row['id']}`} navigate={navigate}>+S</Button>
            <Button title="Add vuln" url={`/storage/vuln/add/host/${row['id']}`} navigate={navigate}>+V</Button>
            <Button title="Add note" url={`/storage/note/add/host/${row['id']}`} navigate={navigate}>+N</Button>
            <EditButton url={`/storage/host/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={urlFor(`/backend/storage/host/delete/${row['id']}`)} tableId="host_list_table" />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Hosts / List - SNER</title>
      </Helmet>

      <Heading headings={['Hosts']}>
        <div className="breadcrumb-buttons pl-2">
          <Link className="btn btn-outline-primary" to="/storage/host/add">
            Add
          </Link>{' '}
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="host_list_table_toolbar" className="dt_toolbar">
        <div data-testid="host_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible() && 'collapse')}>
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
                  url: urlFor('/backend/storage/host/tag_multiid'),
                  tableId: 'host_list_table',
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {appConfig.tags.host.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/host/tag_multiid")} tableId="host_list_table" />
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
              <TagsDropdownButton tags={appConfig.tags.host} url={urlFor("/backend/storage/host/tag_multiid")} tableId="host_list_table" />
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
        ajax_url={urlFor(`/backend/storage/host/list.json${toQueryString(searchParams)}`)}
        select={toolboxesVisible() ? { style: 'multi', selector: 'td:first-child' } : false}
        order={[[2, 'asc']]}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default HostListPage
