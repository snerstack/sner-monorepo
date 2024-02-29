import { escapeHtml } from '@/utils'
import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { useCookie, useLocalStorage } from 'react-use'

import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { deleteRow, getColorForSeverity, getTextForRef, getUrlForRef } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Button from '@/components/buttons/Button'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import MultiCopyButton from '@/components/buttons/MultiCopyButton'
import Tag from '@/components/buttons/Tag'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import ViewButton from '@/components/buttons/ViewButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'
import TagConfigModal from '@/components/modals/TagConfigModal'

import config from '../../../../config.ts'

const HostViewPage = () => {
  const host = useLoaderData() as Host
  const [activeTab, setActiveTab] = useLocalStorage('host_view_tabs_active')
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')
  const [versionInfosCount, setVersionInfosCount] = useState<string>('?')
  const [vulnSearchesCount, setVulnSearchesCount] = useState<string>('?')

  const [annotateHost, setAnnotateHost] = useState<Annotate>({
    show: false,
    tags: host.tags,
    comment: host.comment,
    tableId: '',
    url: urlFor(`/backend/storage/host/annotate/${host.id}`),
  })

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

  const toolboxesVisible = sessionStorage.getItem('dt_toolboxes_visible') == 'true' ? true : false
  const viaTargetVisible = sessionStorage.getItem('dt_viatarget_column_visible') == 'true' ? true : false

  const serviceColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', { visible: false }),
    Column('host_hostname', { visible: false }),
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
      createdCell: (cell, _data: string, row: ServiceRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotateService({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_service_table',
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
          setAnnotateService({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_service_table',
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
            <Button name="+V" title="Add vuln" url={`/storage/service/add/${row['id']}`} navigate={navigate} />
            <Button name="+N" title="Add note" url={`/storage/vuln/add/host/${row['id']}`} navigate={navigate} />
            <EditButton url={`/storage/service/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={urlFor(`/backend/storage/service/delete/${row['id']}`)} tableId="host_view_service_table" />
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
          <ServiceEndpointDropdown
            service={row['service']}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
        ),
    }),
    Column('via_target', { visible: viaTargetVisible }),
    Column('name', {
      createdCell: (cell, _data: string, row: VulnRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/vuln/view/${row['id']}`}
            data-testid="vuln-link"
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
          setAnnotateVuln({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_vuln_table',
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
          setAnnotateVuln({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_vuln_table',
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
            <DeleteButton url={urlFor(`/backend/storage/vuln/delete/${row['id']}`)} tableId="host_view_vuln_table" />
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
          <ServiceEndpointDropdown
            service={row['service']}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
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

        return escapeHtml(data)
      },
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: NoteRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotateNote({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_note_table',
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
          setAnnotateNote({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_note_table',
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
            <DeleteButton url={urlFor(`/backend/storage/note/delete/${row['id']}`)} tableId="host_view_note_table" />
          </ButtonGroup>,
        ),
    }),
  ]

  const [annotateVersioninfo, setAnnotateVersioninfo] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })

  const [multipleTagVersioninfo, setMultipleTagVersioninfo] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const versioninfoColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', { visible: false }),
    Column('host_hostname', { visible: false }),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VersionInfoRow) =>
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
    Column('via_target', { visible: viaTargetVisible }),
    Column('product'),
    Column('version'),
    Column('extra'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VersionInfoRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotateVersioninfo({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_versioninfo_table',
            url: urlFor(`/backend/storage/versioninfo/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="versioninfo_tags_annotate">
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
      createdCell: (cell, _data: string, row: VersionInfoRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotateVersioninfo({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_versioninfo_table',
            url: urlFor(`/backend/storage/versioninfo/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="versioninfo_comment_annotate">{row['comment']}</div>)
      },
    }),
  ]

  const [annotateVulnsearch, setAnnotateVulnsearch] = useState<Annotate>({
    show: false,
    tags: [],
    comment: '',
    tableId: '',
    url: '',
  })

  const [multipleTagVulnsearch, setMultipleTagVulnsearch] = useState<MultipleTag>({
    show: false,
    action: 'set',
    tableId: '',
    url: '',
  })

  const vulnsearchColumns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('host_address', {
      visible: false,
    }),
    Column('host_hostname', {
      visible: false,
    }),
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
          setAnnotateVulnsearch({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_vulnsearch_table',
            url: urlFor(`/backend/storage/vulnsearch/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="vulnsearch_tags_annotate">
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
      createdCell: (cell, _data: string, row: VulnSearchRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotateVulnsearch({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'host_view_vulnsearch_table',
            url: urlFor(`/backend/storage/vulnsearch/annotate/${row['id']}`),
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
        <title>
          Hosts / View / {host.address} {host.hostname || ''} - sner4
        </title>
      </Helmet>
      <Heading headings={['Host', `${host.address}${host.hostname ? ' ' + host.hostname : ''}`]}>
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
              {config.tags.host.map((tag) => (
                <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/host/tag_multiid")} id={host.id} />
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
            <Button title="Add note" name="+N" url={`/storage/note/add/host/${host.id}`} />
            <EditButton url={`/storage/host/edit/${host.id}`} />
          </div>{' '}
          <DeleteButton url={urlFor(`/backend/storage/host/delete/${host.id}`)} />
        </div>
      </Heading>

      <table className="table table-bordered table-sm w-auto">
        <tbody>
          <tr>
            <th>os</th>
            <td>{host.os || 'None'}</td>
          </tr>
          <tr>
            <th>tags</th>
            <td
              className="abutton_annotate_view"
              data-testid="host_tags_annotate"
              onDoubleClick={() => setAnnotateHost({ ...annotateHost, show: true })}
            >
              {host.tags.map((tag) => (
                <Fragment key={tag}>
                  <Tag tag={tag} />{' '}
                </Fragment>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td
              className="abutton_annotate_view"
              data-testid="host_comment_annotate"
              onDoubleClick={() => setAnnotateHost({ ...annotateHost, show: true })}
            >
              {host.comment || 'None'}
            </td>
          </tr>
        </tbody>
      </table>

      <ul id="host_view_tabs" className="nav nav-tabs">
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'service' && 'active')}
            data-testid="service_tab"
            href="#"
            onClick={() => setActiveTab('service')}
          >
            Services <span className="badge badge-pill badge-secondary">{host.servicesCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'vuln' && 'active')}
            data-testid="vuln_tab"
            href="#"
            onClick={() => setActiveTab('vuln')}
          >
            Vulns <span className="badge badge-pill badge-secondary">{host.vulnsCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'note' && 'active')}
            data-testid="note_tab"
            href="#"
            onClick={() => setActiveTab('note')}
          >
            Notes <span className="badge badge-pill badge-secondary">{host.notesCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'versioninfo' && 'active')}
            data-testid="versioninfo_tab"
            href="#"
            onClick={() => setActiveTab('versioninfo')}
          >
            <i className="far fa-clock text-secondary" title="pre-computed data, host links might be dangling"></i>{' '}
            Versioninfos <span className="badge badge-pill badge-secondary">{versionInfosCount}</span>
          </a>
        </li>
        <li className="nav-item">
          <a
            className={clsx('nav-link', activeTab === 'vulnsearch' && 'active')}
            data-testid="vulnsearch_tab"
            href="#"
            onClick={() => setActiveTab('vulnsearch')}
          >
            <i className="far fa-clock text-secondary" title="pre-computed data, host links might be dangling"></i>{' '}
            Vulnsearches <span className="badge badge-pill badge-secondary">{vulnSearchesCount}</span>
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
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="host_view_service_select_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_service_table')
                      dt.rows({ page: 'current' }).select()
                    }}
                  >
                    All
                  </a>
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="host_view_service_unselect_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_service_table')
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
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_service_table',
                        url: urlFor('/backend/storage/service/tag_multiid'),
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {config.tags.service.map((tag) => (
                    <TagButton
                      tag={tag}
                      key={tag}
                      url={urlFor("/backend/storage/service/tag_multiid")}
                      tableId="host_view_service_table"
                    />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="service_unset_multiple_tag"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_service_table',
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
                      tableId="host_view_service_table"
                    />
                  </div>
                  <a
                    data-testid="service-delete-row-btn"
                    className="btn btn-outline-secondary"
                    href="#"
                    onClick={() => deleteRow('host_view_service_table', urlFor('/backend/storage/service/delete_multiid'))}
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
                url: urlFor(`/backend/storage/service/list.json?filter=Host.id=="${host.id}"`),
                type: 'POST',
                xhrFields: { withCredentials: true },
                beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
              }}
              order={[5, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateService} setAnnotate={setAnnotateService} />
            <MultipleTagModal multipleTag={multipleTagService} setMultipleTag={setMultipleTagService} />
            <TagConfigModal tableId="host_view_service_table" />
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
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="host_view_vuln_select_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_vuln_table')
                      dt.rows({ page: 'current' }).select()
                    }}
                  >
                    All
                  </a>
                  <a
                    className="btn btn-outline-secondary abutton_selectnone"
                    href="#"
                    data-testid="host_view_vuln_unselect_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_vuln_table')
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
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_vuln_table',
                        url: urlFor('/backend/storage/vuln/tag_multiid'),
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {config.tags.vuln.map((tag) => (
                    <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/vuln/tag_multiid")} tableId="host_view_vuln_table" />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="vuln_unset_multiple_tag"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_vuln_table',
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
                    <TagsDropdownButton
                      tags={config.tags.vuln}
                      url={urlFor("/backend/storage/vuln/tag_multiid")}
                      tableId="host_view_vuln_table"
                    />
                  </div>
                  <a
                    data-testid="vuln-delete-row-btn"
                    className="btn btn-outline-secondary abutton_delete_multiid"
                    href="#"
                    onClick={() => deleteRow('host_view_vuln_table', urlFor('/backend/storage/vuln/delete_multiid'))}
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
                url: urlFor(`/backend/storage/vuln/list.json?filter=Host.id=="${host.id}"`),
                type: 'POST',
                xhrFields: { withCredentials: true },
                beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
              }}
              order={[1, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateVuln} setAnnotate={setAnnotateVuln} />
            <MultipleTagModal multipleTag={multipleTagVuln} setMultipleTag={setMultipleTagVuln} />
            <TagConfigModal tableId="host_view_vuln_table" />
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
                  <a
                    className="btn btn-outline-secondary abutton_selectall"
                    href="#"
                    data-testid="host_view_note_select_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_note_table')
                      dt.rows({ page: 'current' }).select()
                    }}
                  >
                    All
                  </a>
                  <a
                    className="btn btn-outline-secondary abutton_selectnone"
                    href="#"
                    data-testid="host_view_note_unselect_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_note_table')
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
                    data-testid="note_set_multiple_tag"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_note_table',
                        url: urlFor('/backend/storage/note/tag_multiid'),
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {config.tags.note.map((tag) => (
                    <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/note/tag_multiid")} tableId="host_view_note_table" />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="note_unset_multiple_tag"
                    onClick={() =>
                      setMultipleTagService({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_note_table',
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
                    <TagsDropdownButton
                      tags={config.tags.note}
                      url={urlFor("/backend/storage/note/tag_multiid")}
                      tableId="host_view_note_table"
                    />
                  </div>
                  <a
                    data-testid="note-delete-row-btn"
                    className="btn btn-outline-secondary abutton_delete_multiid"
                    href="#"
                    onClick={() => deleteRow('host_view_note_table', urlFor('/backend/storage/note/delete_multiid'))}
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
                url: urlFor(`/backend/storage/note/list.json?filter=Host.id=="${host.id}"`),
                type: 'POST',
                xhrFields: { withCredentials: true },
                beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
              }}
              order={[1, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
            />

            <AnnotateModal annotate={annotateNote} setAnnotate={setAnnotateNote} />
            <MultipleTagModal multipleTag={multipleTagNote} setMultipleTag={setMultipleTagNote} />
            <TagConfigModal tableId="host_view_note_table" />
          </div>
        </>
        <>
          <div id="host_view_versioninfo_tab" className={clsx('tab-pane', activeTab === 'versioninfo' && 'active')}>
            <div id="host_view_versioninfo_table_toolbar" className="dt_toolbar">
              <div
                id="host_view_versioninfo_table_toolbox"
                className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}
              >
                <div className="btn-group">
                  <a className="btn btn-outline-secondary disabled">
                    <i className="fas fa-check-square"></i>
                  </a>
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="host_view_versioninfo_select_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_versioninfo_table')
                      dt.rows({ page: 'current' }).select()
                    }}
                  >
                    All
                  </a>
                  <a
                    className="btn btn-outline-secondary abutton_selectnone"
                    href="#"
                    data-testid="host_view_versioninfo_unselect_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_versioninfo_table')
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
                    data-testid="versioninfo_set_multiple_tag"
                    onClick={() =>
                      setMultipleTagVersioninfo({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_versioninfo_table',
                        url: urlFor('/backend/storage/versioninfo/tag_multiid'),
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {config.tags.versioninfo.map((tag) => (
                    <TagButton
                      tag={tag}
                      key={tag}
                      url={urlFor("/backend/storage/versioninfo/tag_multiid")}
                      tableId="host_view_versioninfo_table"
                    />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="versioninfo_unset_multiple_tag"
                    onClick={() =>
                      setMultipleTagVersioninfo({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_versioninfo_table',
                        url: urlFor('/backend/storage/versioninfo/tag_multiid'),
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
                      tags={config.tags.versioninfo}
                      url={urlFor("/backend/storage/versioninfo/tag_multiid")}
                      tableId="host_view_versioninfo_table"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DataTable
              id="host_view_versioninfo_table"
              columns={versioninfoColumns}
              ajax={{
                url: urlFor(`/backend/storage/versioninfo/list.json?filter=Versioninfo.host_id=="${host.id}"`),
                type: 'POST',
                xhrFields: { withCredentials: true },
                beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
              }}
              order={[6, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
              drawCallback={(settings) => {
                setVersionInfosCount((settings as { json: { recordsTotal: string } }).json.recordsTotal)
              }}
            />

            <AnnotateModal annotate={annotateVersioninfo} setAnnotate={setAnnotateVersioninfo} />
            <MultipleTagModal multipleTag={multipleTagVersioninfo} setMultipleTag={setMultipleTagVersioninfo} />
            <TagConfigModal tableId="host_view_versioninfo_table" />
          </div>
        </>
        <>
          <div id="host_view_vulnsearch_tab" className={clsx('tab-pane', activeTab === 'vulnsearch' && 'active')}>
            <div id="host_view_vulnsearch_table_toolbar" className="dt_toolbar">
              <div
                id="host_view_vulnsearch_table_toolbox"
                className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}
              >
                <div className="btn-group">
                  <a className="btn btn-outline-secondary disabled">
                    <i className="fas fa-check-square"></i>
                  </a>
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="host_view_vulnsearch_select_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_vulnsearch_table')
                      dt.rows({ page: 'current' }).select()
                    }}
                  >
                    All
                  </a>
                  <a
                    className="btn btn-outline-secondary abutton_selectnone"
                    href="#"
                    data-testid="host_view_vulnsearch_unselect_all"
                    onClick={() => {
                      const dt = getTableApi('host_view_vulnsearch_table')
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
                    data-testid="vulnsearch_set_multiple_tag"
                    onClick={() =>
                      setMultipleTagVulnsearch({
                        show: true,
                        action: 'set',
                        tableId: 'host_view_vulnsearch_table',
                        url: urlFor('/backend/storage/vulnsearch/tag_multiid'),
                      })
                    }
                  >
                    <i className="fas fa-tag"></i>
                  </a>
                  {config.tags.versioninfo.map((tag) => (
                    <TagButton
                      tag={tag}
                      key={tag}
                      url={urlFor("/backend/storage/vulnsearch/tag_multiid")}
                      tableId="host_view_vulnsearch_table"
                    />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a
                    className="btn btn-outline-secondary"
                    href="#"
                    data-testid="vulnsearch_unset_multiple_tag"
                    onClick={() =>
                      setMultipleTagVulnsearch({
                        show: true,
                        action: 'unset',
                        tableId: 'host_view_vulnsearch_table',
                        url: urlFor('/backend/storage/vulnsearch/tag_multiid'),
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
                      tags={config.tags.versioninfo}
                      url={urlFor("/backend/storage/vulnsearch/tag_multiid")}
                      tableId="host_view_vulnsearch_table"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DataTable
              id="host_view_vulnsearch_table"
              columns={vulnsearchColumns}
              ajax={{
                url: urlFor(`/backend/storage/vulnsearch/list.json?filter=Vulnsearch.host_id=="${host.id}"`),
                type: 'POST',
                xhrFields: { withCredentials: true },
                beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
              }}
              order={[1, 'asc']}
              select={toolboxesVisible ? { style: 'multi', selector: 'td:first-child' } : false}
              drawCallback={(settings) => {
                setVulnSearchesCount((settings as { json: { recordsTotal: string } }).json.recordsTotal)
              }}
            />

            <AnnotateModal annotate={annotateVulnsearch} setAnnotate={setAnnotateVulnsearch} />
            <MultipleTagModal multipleTag={multipleTagVulnsearch} setMultipleTag={setMultipleTagVulnsearch} />
            <TagConfigModal tableId="host_view_vulnsearch_table" />
          </div>
        </>
      </div>
      <AnnotateModal annotate={annotateHost} setAnnotate={setAnnotateHost} />
    </div>
  )
}
export default HostViewPage
