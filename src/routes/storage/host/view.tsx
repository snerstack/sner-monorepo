import { escapeHtml } from '@/utils'
import env from 'app-env'
import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { useLocalStorage, useSessionStorage } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, renderElements } from '@/lib/DataTables'
import {
  deleteRow,
  getColorForSeverity,
  getColorForTag,
  getLinksForService,
  getTextForRef,
  getUrlForRef,
} from '@/lib/sner/storage'

import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DropdownButton from '@/components/Buttons/DropdownButton'
import EditButton from '@/components/Buttons/EditButton'
import MultiCopyButton from '@/components/Buttons/MultiCopyButton'
import TagButton from '@/components/Buttons/TagButton'
import TagsDropdownButton from '@/components/Buttons/TagsDropdownButton'
import ViewButton from '@/components/Buttons/ViewButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import AnnotateModal from '@/components/Modals/AnnotateModal'
import MultipleTagModal from '@/components/Modals/MultipleTagModal'

const HostViewPage = () => {
  const host = useLoaderData() as Host
  const [activeTab, setActiveTab] = useLocalStorage('host_view_tabs_active')
  const [toolboxesVisible] = useSessionStorage('dt_toolboxes_visible')
  const [viaTargetVisible] = useSessionStorage('dt_viatarget_column_visible')
  const navigate = useNavigate()

  const [annotateService, setAnnotateService] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })

  const [multipleTagService, setMultipleTagService] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const serviceColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', { visible: false }),
    Column('host_hostname', { visible: false }),
    Column('proto'),
    Column('port'),
    Column('name'),
    Column('state'),
    Column('info'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string, row: ServiceRow) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotateService({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_service_table',
                url: `/storage/service/annotate/${row['id']}`,
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
      createdCell: (cell, _data: string, row: ServiceRow) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotateService({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_service_table',
                url: `/storage/service/annotate/${row['id']}`,
              })
            }
          >
            {row['comment']}
          </div>,
        ),
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
            <Button name="+V" title="Add vuln" url={`/storage/service/add/${row['id']}`} navigate={navigate} />
            <Button name="+N" title="Add note" url={`/storage/vuln/add/host/${row['id']}`} navigate={navigate} />
            <EditButton url={`/storage/service/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={`/storage/service/delete/${row['id']}`} />
          </ButtonGroup>,
        ),
    }),
  ]

  const [annotateVuln, setAnnotateVuln] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })

  const [multipleTagVuln, setMultipleTagVuln] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const vulnColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', { visible: false }),
    Column('host_hostname', { visible: false }),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VulnRow) =>
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
    Column('name', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <a
            href={`/vuln/view/${row['id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/vuln/view/${row['id']}`)
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
          <>
            <span className={clsx('badge', getColorForSeverity(row['severity']))}>{row['severity']}</span>{' '}
          </>,
        ),
    }),
    Column('refs', {
      createdCell: (cell, _data: string[], row: VulnRow) =>
        renderElements(
          cell,
          <>
            {row['refs'].map((ref) => (
              <>
                <a rel="noreferrer" href={getUrlForRef(ref)}>
                  {getTextForRef(ref)}
                </a>{' '}
              </>
            ))}
          </>,
        ),
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VulnRow) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotateVuln({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_vuln_table',
                url: `/storage/vuln/annotate/${row['id']}`,
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
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <div
            onDoubleClick={() =>
              setAnnotateVuln({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_vuln_table',
                url: `/storage/vuln/annotate/${row['id']}`,
              })
            }
          >
            {row['comment']}
          </div>,
        ),
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
            <DeleteButton url={`/storage/vuln/delete/${row['id']}`} />
          </ButtonGroup>,
        ),
    }),
  ]

  const [annotateNote, setAnnotateNote] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })

  const [multipleTagNote, setMultipleTagNote] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const noteColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', { visible: false }),
    Column('host_hostname', { visible: false }),
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
    Column('xtype', { visible: false }),
    Column('data', {
      className: 'forcewrap',
      render: (data: string) => {
        if (!data) return

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
            onDoubleClick={() =>
              setAnnotateNote({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_note_table',
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
            onDoubleClick={() =>
              setAnnotateNote({
                show: true,
                tags: row['tags'],
                comment: row['comment'] || '',
                tableId: 'host_view_note_table',
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
      <Heading headings={['Host', `${host.address} ${host.hostname}`]}>
        <div className="breadcrumb-buttons pl-2">
          <div className="btn-group">
            <a className="btn btn-light disabled">
              <i className="fas fa-external-link-alt text-link"></i>
            </a>
            <a
              className="btn btn-light"
              rel="noreferrer"
              href={`https://apps.db.ripe.net/db-web-ui/#/query?searchtext=${host.address}`}
            >
              ripe
            </a>
            <a className="btn btn-light" rel="noreferrer" href={`https://nerd.cesnet.cz/nerd/ip/${host.address}`}>
              nerd
            </a>
            <a
              className="btn btn-light"
              rel="noreferrer"
              href={`http://multirbl.valli.org/lookup/${host.address}.html`}
            >
              multirbl.valli
            </a>
            <a className="btn btn-light" rel="noreferrer" href={`https://www.shodan.io/search?query=${host.address}`}>
              shodan
            </a>
            <a
              className="btn btn-light"
              rel="noreferrer"
              href={`https://www.talosintelligence.com/reputation_center/lookup?search=${host.address}`}
            >
              talos
            </a>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-primary disabled">
              <i className="fas fa-tag text-primary"></i>
            </a>
            <>
              {env.VITE_HOST_TAGS.map((tag) => (
                <TagButton tag={tag} key={tag} />
              ))}
            </>
          </div>{' '}
          <div className="btn-group">
            <DropdownButton
              title="More data"
              options={[
                { name: 'created', data: host.created },
                { name: 'modified', data: host.modified },
                { name: 'rescan_time', data: host.rescan_time },
              ]}
              small={false}
            />
            <Button title="Add service" name="+S" url={`/storage/service/add/${host.id}`} />
            <Button title="Add vuln" name="+V" url={`/storage/vuln/add/host/${host.id}`} />
            <Button title="Add nite" name="+N" url={`/storage/note/add/host/${host.id}`} />
            <EditButton url={`/storage/host/edit/${host.id}`} />
          </div>{' '}
          <DeleteButton url={`/storage/host/delete/${host.id}`} />
        </div>
      </Heading>

      <table className="table table-bordered table-sm w-auto">
        <tbody>
          <tr>
            <th>os</th>
            <td>{host.os}</td>
          </tr>
          <tr>
            <th>tags</th>
            <td className="abutton_annotate_view">
              {host.tags.map((tag) => (
                <Fragment key={tag}>
                  <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
                </Fragment>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td className="abutton_annotate_view">{host.comment}</td>
          </tr>
        </tbody>
      </table>

      <ul id="host_view_tabs" className="nav nav-tabs">
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'service' && 'active')}
            href="#"
            onClick={() => setActiveTab('service')}
          >
            Services <span className="badge badge-pill badge-secondary">{host.servicesCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'vuln' && 'active')}
            href="#"
            onClick={() => setActiveTab('vuln')}
          >
            Vulns <span className="badge badge-pill badge-secondary">{host.vulnsCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'note' && 'active')}
            href="#"
            onClick={() => setActiveTab('note')}
          >
            Notes <span className="badge badge-pill badge-secondary">{host.notesCount}</span>
          </a>
        </li>
      </ul>

      <div className="tab-content">
        <>
          <div id="host_view_service_tab" className={clsx('tab-pane', activeTab === 'service' && 'active')}>
            <div id="host_view_service_table_toolbar" className="dt_toolbar">
              <div
                id="host_view_service_table_toolbox"
                className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}
              >
                <div className="btn-group">
                  <a className="btn btn-outline-secondary disabled">
                    <i className="fas fa-check-square"></i>
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectall" href="#">
                    All
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectnone" href="#">
                    None
                  </a>
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_service_table',
                        url: '/storage/service/tag_multiid',
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_SERVICE_TAGS.map((tag) => (
                    <TagButton
                      tag={tag}
                      key={tag}
                      url="/storage/service/tag_multiid"
                      tableId="host_view_service_table"
                    />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_service_table',
                        url: '/storage/service/tag_multiid',
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
                      tags={env.VITE_SERVICE_TAGS}
                      url="/storage/service/tag_multiid"
                      tableId="host_view_service_table"
                    />
                  </div>
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() => deleteRow('host_view_service_table', '/storage/service/delete_multiid')}
                  >
                    <i className="fas fa-trash text-danger"></i>
                  </a>
                </div>
              </div>
            </div>

            <DataTable
              id="host_view_service_table"
              columns={serviceColumns}
              ajax={{
                url: env.VITE_SERVER_URL + `/storage/service/list.json?filter=Host.id=="${host.id}"`,
                type: 'POST',
                xhrFields: { withCredentials: true },
              }}
              order={[5, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateService} setAnnotate={setAnnotateService} />
            <MultipleTagModal multipleTag={multipleTagService} setMultipleTag={setMultipleTagService} />
          </div>
        </>

        <>
          <div id="host_view_vuln_tab" className={clsx('tab-pane', activeTab === 'vuln' && 'active')}>
            <div id="host_view_vuln_table_toolbar" className="dt_toolbar">
              <div id="host_view_vuln_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
                <div className="btn-group">
                  <a className="btn btn-outline-secondary disabled">
                    <i className="fas fa-check-square"></i>
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectall" href="#">
                    All
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectnone" href="#">
                    None
                  </a>
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_vuln_table',
                        url: '/storage/vuln/tag_multiid',
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_VULN_TAGS.map((tag) => (
                    <TagButton tag={tag} key={tag} url="/storage/vuln/tag_multiid" tableId="host_view_vuln_table" />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_vuln_table',
                        url: '/storage/vuln/tag_multiid',
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
                      tags={env.VITE_VULN_TAGS}
                      url="/storage/vuln/tag_multiid"
                      tableId="host_view_vuln_table"
                    />
                  </div>
                  <a
                    className="btn btn-outline-secondary abutton_delete_multiid"
                    href="#"
                    onClick={() => deleteRow('host_view_vuln_table', '/storage/vuln/delete_multiid')}
                  >
                    <i className="fas fa-trash text-danger"></i>
                  </a>
                </div>
              </div>
            </div>

            <DataTable
              id="host_view_vuln_table"
              columns={vulnColumns}
              ajax={{
                url: env.VITE_SERVER_URL + `/storage/vuln/list.json?filter=Host.id=="${host.id}"`,
                type: 'POST',
                xhrFields: { withCredentials: true },
              }}
              order={[1, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateVuln} setAnnotate={setAnnotateVuln} />
            <MultipleTagModal multipleTag={multipleTagVuln} setMultipleTag={setMultipleTagVuln} />
          </div>
        </>
        <>
          <div id="host_view_note_tab" className={clsx('tab-pane', activeTab === 'note' && 'active')}>
            <div id="host_view_note_table_toolbar" className="dt_toolbar">
              <div
                id="host_view_note_table_toolbox"
                className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}
              >
                <div className="btn-group">
                  <a className="btn btn-outline-secondary disabled">
                    <i className="fas fa-check-square"></i>
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectall" href="#">
                    All
                  </a>
                  <a className="btn btn-outline-secondary abutton_selectnone" href="#">
                    None
                  </a>
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_note_table',
                        url: '/storage/note/tag_multiid',
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_NOTE_TAGS.map((tag) => (
                    <TagButton tag={tag} key={tag} url="/storage/note/tag_multiid" tableId="host_view_note_table" />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_note_table',
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
                      tags={env.VITE_NOTE_TAGS}
                      url="/storage/note/tag_multiid"
                      tableId="host_view_note_table"
                    />
                  </div>
                  <a
                    className="btn btn-outline-secondary abutton_delete_multiid"
                    href="#"
                    onClick={() => deleteRow('host_view_note_table', '/storage/note/delete_multiid')}
                  >
                    <i className="fas fa-trash text-danger"></i>
                  </a>
                </div>
              </div>
            </div>

            <DataTable
              id="host_view_note_table"
              columns={noteColumns}
              ajax={{
                url: env.VITE_SERVER_URL + `/storage/note/list.json?filter=Host.id=="${host.id}"`,
                type: 'POST',
                xhrFields: { withCredentials: true },
              }}
              order={[1, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateNote} setAnnotate={setAnnotateNote} />
            <MultipleTagModal multipleTag={multipleTagNote} setMultipleTag={setMultipleTagNote} />
          </div>
        </>
      </div>
    </div>
  )
}
export default HostViewPage
