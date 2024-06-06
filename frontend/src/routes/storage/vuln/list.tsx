import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { DEFAULT_ANNOTATE_STATE, DEFAULT_MULTIPLE_TAG_STATE, deleteRow, getColorForSeverity, getTextForRef, getUrlForRef, viaTargetVisible } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import MultiCopyButton from '@/components/buttons/MultiCopyButton'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

import config from '../../../../config.ts'

const VulnListPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)
  const [multipleTag, setMultipleTag] = useState<MultipleTag>(DEFAULT_MULTIPLE_TAG_STATE)

  const columns = [
    ColumnSelect({ visible: true }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, _data: string, row: VulnRow) =>
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
      createdCell: (cell, _data: string, row: VulnRow) =>
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
    Column('via_target', {
      visible: viaTargetVisible(),
    }),
    Column('name', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/vuln/view/${row['id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/vuln/view/${row['id']}`)
            }}
          >
            {row['name']}
          </a>,
        ),
    }),
    Column('xtype', { visible: false }),
    Column('severity', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <span className={clsx('badge', getColorForSeverity(row['severity']))}>{row['severity']}</span>,
        ),
    }),
    Column('refs', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <>
            {row['refs'].map((ref) => (
              <Fragment key={ref}>
                <a rel="noreferrer" href={getUrlForRef(ref)}>
                  {getTextForRef(ref)}
                </a>{' '}
              </Fragment>
            ))}
          </>,
        ),
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VulnRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vuln_list_table',
            url: urlFor(`/backend/storage/vuln/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="vuln_tags_annotate">
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
      createdCell: (cell, _data: string, row: VulnRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vuln_list_table',
            url: urlFor(`/backend/storage/vuln/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="vuln_comment_annotate">{row['comment']}</div>)
      },
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: VulnRow) =>
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
            <EditButton url={`/storage/vuln/edit/${row['id']}`} navigate={navigate} />
            <MultiCopyButton url={`/storage/vuln/multicopy/${row['id']}`} navigate={navigate} />
            <DeleteButton url={urlFor(`/backend/storage/vuln/delete/${row['id']}`)} tableId="vuln_list_table" />
          </ButtonGroup>,
        ),
    }),
  ]
  return (
    <div>
      <Helmet>
        <title>Vulns / List - sner4</title>
      </Helmet>
      <Heading headings={['Vulns']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-primary" href={urlFor('/backend/storage/vuln/report')}>
            Report
          </a>{' '}
          <a
            className="btn btn-outline-primary"
            href={urlFor('/backend/storage/vuln/report?group_by_host=True')}
          >
            Report by host
          </a>{' '}
          <a className="btn btn-outline-primary" href={urlFor('/backend/storage/vuln/export')}>
            Export
          </a>{' '}
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="vuln_list_table_toolbar" className="dt_toolbar">
        <div data-testid="vuln_list_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vuln_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('vuln_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vuln_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('vuln_list_table')
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
              data-testid="vuln_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'vuln_list_table',
                  url: urlFor('/backend/storage/vuln/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {config.tags.vuln.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/vuln/tag_multiid")} tableId="vuln_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_unset_multiid"
              href="#"
              data-testid="vuln_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'vuln_list_table',
                  url: urlFor('/backend/storage/vuln/tag_multiid'),
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
              <TagsDropdownButton tags={config.tags.vuln} url={urlFor("/backend/storage/vuln/tag_multiid")} tableId="vuln_list_table" />
            </div>
            <a
              data-testid="delete-row-btn"
              className="btn btn-outline-secondary"
              href="#"
              onClick={() => deleteRow('vuln_list_table', urlFor('/backend/storage/vuln/delete_multiid'))}
            >
              <i className="fas fa-trash text-danger"></i>
            </a>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link className="btn btn-outline-secondary" to='/storage/vuln/list?filter=Vuln.tags=="{}"'>
              Not tagged
            </Link>
            <Link className="btn btn-outline-secondary" to='/storage/vuln/list?filter=Vuln.tags!="{}"'>
              Tagged
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vuln/list?filter=Vuln.tags not_any "report" AND Vuln.tags not_any "report:data" AND Vuln.tags not_any "info"'
            >
              Exclude reviewed
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vuln/list?filter=Vuln.tags any "report" OR Vuln.tags any "report:data"'
            >
              Only Report
            </Link>
          </div>
        </div>
        <FilterForm url="/storage/vuln/list" />
      </div>
      <DataTable
        id="vuln_list_table"
        columns={columns}
        ajax={{
          url: urlFor(
            '/backend/storage/vuln/list.json' +
            (searchParams.toString() ? `?${searchParams.toString()}` : ''),
          ),
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
        order={[[1, 'asc']]}
        select={{ style: 'multi', selector: 'td:first-child' }}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default VulnListPage
