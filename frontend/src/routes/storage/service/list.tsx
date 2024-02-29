import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { deleteRow } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Button from '@/components/buttons/Button'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import Tag from '@/components/buttons/Tag'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'
import TagConfigModal from '@/components/modals/TagConfigModal'

import config from '../../../../config.ts'

const ServiceListPage = () => {
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
    Column('host_id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, data: string, row: ServiceRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/host/view/${row['host_id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['host_id']}`)
            }}
          >
            {data}
          </a>,
        ),
    }),
    Column('host_hostname'),
    Column('proto'),
    Column('port', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: ServiceRow) =>
        renderElements(
          cell,
          <ServiceEndpointDropdown
            service={row['port'].toString()}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['proto']}
            port={row['port']}
          />,
        ),
    }),
    Column('name'),
    Column('state'),
    Column('info'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: ServiceRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'service_list_table',
            url: urlFor(`/backend/storage/service/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="service_tags_annotate">
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
      createdCell: (cell, _data: string, row: ServiceRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'service_list_table',
            url: urlFor(`/backend/storage/service/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="service_comment_annotate">{row['comment']}</div>)
      },
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: ServiceRow) =>
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
                {
                  name: 'import_time',
                  data: row['import_time'] || '',
                },
              ]}
            />
            <Button name="+V" title="Add vuln" url={`/storage/vuln/add/service/${row['id']}`} navigate={navigate} />
            <Button name="+N" title="Add note" url={`/storage/note/add/service/${row['id']}`} navigate={navigate} />
            <EditButton url={`/storage/service/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={urlFor(`/backend/storage/service/delete/${row['id']}`)} tableId="service_list_table" />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Services / List - sner4</title>
      </Helmet>
      <Heading headings={['Services']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="service_list_table_toolbar" className="dt_toolbar">
        <div id="service_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="service_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('service_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="service_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('service_list_table')
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
              data-testid="service_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'service_list_table',
                  url: urlFor('/backend/storage/service/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {config.tags.service.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/service/tag_multiid")} tableId="service_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary"
              href="#"
              data-testid="service_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'service_list_table',
                  url: urlFor('/backend/storage/service/tag_multiid'),
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
                tags={config.tags.service}
                url={urlFor("/backend/storage/service/tag_multiid")}
                tableId="service_list_table"
              />
            </div>
            <a
              data-testid="delete-row-btn"
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('service_list_table', urlFor('/backend/storage/service/delete_multiid'))}
            >
              <i className="fas fa-trash text-danger"></i>
            </a>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/service/list?filter=Service.tags+not_any+"reviewed"'
            >
              Exclude reviewed
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/service/list?filter=Service.tags+any+"todo"'>
              Only Todo
            </Link>
          </div>
        </div>
        <FilterForm url="/storage/service/list" />
      </div>

      <DataTable
        id="service_list_table"
        columns={columns}
        ajax={{
          url: urlFor(
            '/backend/storage/service/list.json' +
            (searchParams.toString() ? `?${searchParams.toString()}` : ''),
          ),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
        select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
        order={[[3, 'asc'], [1, 'asc']]}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
      <TagConfigModal tableId="service_list_table" />
    </div>
  )
}
export default ServiceListPage
