import { escapeHtml } from '@/utils'
import env from 'app-env'
import clsx from 'clsx'
import { renderToString } from 'react-dom/server'
import { useLoaderData } from 'react-router-dom'
import { useLocalStorage, useSessionStorage } from 'react-use'

import { Column, ColumnButtons, ColumnSelect } from '@/lib/DataTables'
import {
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

const HostViewPage = () => {
  const host = useLoaderData() as Host
  const [activeTab, setActiveTab] = useLocalStorage('host_view_tabs_active')
  const [toolboxesVisible] = useSessionStorage('dt_toolboxes_visible')

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
      render: (data, type, row, meta) => {
        let tags = ''
        row['tags'].forEach(
          (tag) => (tags += `<span className="badge ${getColorForTag(tag)} tag-badge">${tag}</span> `),
        )

        return tags
      },
    }),
    Column('comment', { className: 'abutton_annotate_dt forcewrap', title: 'cmnt' }),
    ColumnButtons({
      render: (data, type, row, meta) =>
        renderToString(
          ButtonGroup({
            children: [
              DropdownButton({
                title: 'More data',
                options: [
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
                    data: row['import_time'],
                  },
                ],
              }),
              Button({ name: '+V', title: 'Add vuln', url: `/storage/vuln/add/service/${row['id']}` }),
              Button({ name: '+N', title: 'Add note', url: `/storage/note/add/service/${row['id']}` }),
              EditButton({ url: `/storage/service/edit/${row['id']}` }),
              DeleteButton({ url: `/storage/service/delete/${row['id']}` }),
            ],
          }),
        ),
    }),
  ]

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
      render: (data, type, row, meta) => {
        if (!row['service']) return ''

        const { host_address, host_hostname, service_proto, service_port } = row

        let linkElements = ''

        for (const link of getLinksForService(host_address, host_hostname, service_proto, service_port)) {
          linkElements += `<span className="dropdown-item"><i className="far fa-clipboard" title="Copy to clipboard"></i> <a rel="noreferrer" href=${escapeHtml(
            link,
          )}>${escapeHtml(link)}</a></span>`
        }

        return `<div className="dropdown d-flex">
            <a className="flex-fill" data-toggle="dropdown">${row['service']}</a>
            <div className="dropdown-menu">
            <h6 className="dropdown-header">Service endpoint URIs</h6>
            ${linkElements}
            </div>
        </div>`
      },
    }),
    Column('via_target', { visible: JSON.parse(sessionStorage.getItem('dt_viatarget_column_visible')) }),
    Column('name', {
      render: (data, type, row, meta) => {
        return `<a href="/vuln/view/${row['id']}">${row['name']}</a>`
      },
    }),
    Column('xtype', { visible: false }),
    Column('severity', {
      render: (data, type, row, meta) => {
        return `<span className="badge ${getColorForSeverity(row['severity'])}">${row['severity']}</span> `
      },
    }),
    Column('refs', {
      render: (data, type, row, meta) => {
        let refs = ''
        row['refs'].forEach(
          (ref) => (refs += `<a rel="noreferrer" href="${getUrlForRef(ref)}">${getTextForRef(ref)}</a> `),
        )

        return refs
      },
    }),
    Column('tags', {
      render: (data, type, row, meta) => {
        let tags = ''
        row['tags'].forEach(
          (tag) => (tags += `<span className="badge ${getColorForTag(tag)} tag-badge">${tag}</span> `),
        )

        return tags
      },
    }),
    Column('comment', { className: 'abutton_annotate_dt forcewrap', title: 'cmnt' }),
    ColumnButtons({
      render: (data, type, row, meta) =>
        renderToString(
          ButtonGroup({
            children: [
              DropdownButton({
                title: 'More data',
                options: [
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
                    data: row['import_time'],
                  },
                ],
              }),
              EditButton({ url: `/storage/vuln/edit/${row['id']}` }),
              MultiCopyButton({ url: `/storage/vuln/multicopy/${row['id']}` }),
              DeleteButton({ url: `/storage/vuln/delete/${row['id']}` }),
            ],
          }),
        ),
    }),
  ]

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
      render: (data, type, row, meta) => {
        if (!row['service']) return ''

        const { host_address, host_hostname, service_proto, service_port } = row

        let linkElements = ''

        for (const link of getLinksForService(host_address, host_hostname, service_proto, service_port)) {
          linkElements += `<span class="dropdown-item"><i class="far fa-clipboard" title="Copy to clipboard"></i> <a rel="noreferrer" href=${escapeHtml(
            link,
          )}>${escapeHtml(link)}</a></span>`
        }

        return `<div class="dropdown d-flex">
            <a class="flex-fill" data-toggle="dropdown">${row['service']}</a>
            <div class="dropdown-menu">
            <h6 class="dropdown-header">Service endpoint URIs</h6>
            ${linkElements}
            </div>
        </div>`
      },
    }),
    Column('via_target', { visible: JSON.parse(sessionStorage.getItem('dt_viatarget_column_visible')) }),
    Column('xtype', { visible: false }),
    Column('data', {
      className: 'forcewrap',
      render: (data, type, row, meta) => {
        if (data.length >= 4096) {
          return data.substring(0, 4095) + '...'
        }

        return data
      },
    }),
    Column('tags', {
      className: 'abutton_annotate_dt',
      render: (data, type, row, meta) => {
        let tags = ''
        row['tags'].forEach((tag) => (tags += `<span class="badge ${getColorForTag(tag)} tag-badge">${tag}</span> `))

        return tags
      },
    }),
    Column('comment', { className: 'abutton_annotate_dt forcewrap', title: 'cmnt' }),
    ColumnButtons({
      render: (data, type, row, meta) =>
        renderToString(
          ButtonGroup({
            children: [
              DropdownButton({
                title: 'More data',
                options: [
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
                    data: row['import_time'],
                  },
                ],
              }),
              ViewButton({ url: `/storage/note/view/${row['id']}` }),
              EditButton({ url: `/storage/note/edit/${row['id']}` }),
              DeleteButton({ url: `/storage/note/delete/${row['id']}` }),
            ],
          }),
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
            <Button title="Add vuln" name="+V" url={`/storage/vuln/add/host${host.id}`} />
            <Button title="Add nite" name="+N" url={`/storage/note/add/host${host.id}`} />
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
            <td
              className="render_hbs abutton_annotate_view"
              data-hbs="storage.hbs.tag_labels"
              data-annotate_route="storage.host_annotate_route"
              data-model_id={host.id}
            >
              {host.tags.map((tag) => (
                <>
                  <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
                </>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td
              className="abutton_annotate_view"
              data-annotate_route="storage.host_annotate_route"
              data-model_id={host.id}
            >
              {host.comment}
            </td>
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
                  <a className="btn btn-outline-secondary abutton_freetag_set_multiid" href="#">
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_SERVICE_TAGS.map((tag) => (
                    <TagButton tag={tag} key={tag} />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a className="btn btn-outline-secondary abutton_freetag_unset_multiid" href="#">
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
                    <TagsDropdownButton tags={env.VITE_SERVICE_TAGS} />
                  </div>
                  <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
            {/* 

                'drawCallback': function (settings) {
                  Sner.dt.ajax_options['drawCallback'].call(this, settings); // call parent
                  this.find('td.abutton_annotate_dt').on('dblclick', {'dt': this.api(), 'route_name': 'storage.service_annotate_route'}, Sner.storage.action_annotate_dt);
                }
              };
              $(document).ready(function() {
                var dt_host_view_service_table = Sner.dt.init_datatable('#host_view_service_table', dt_host_view_service_table_options);
                $('#host_view_service_table_toolbar .abutton_selectall').on('click', {'dt': dt_host_view_service_table}, Sner.dt.selectall);
                $('#host_view_service_table_toolbar .abutton_selectnone').on('click', {'dt': dt_host_view_service_table}, Sner.dt.selectnone);
                $('#host_view_service_table_toolbar .abutton_tag_multiid').on('click', {'dt': dt_host_view_service_table, 'route_name': 'storage.service_tag_multiid_route', 'action': 'set'}, Sner.storage.action_tag_multiid);
                $('#host_view_service_table_toolbar .abutton_untag_multiid').on('click', {'dt': dt_host_view_service_table, 'route_name': 'storage.service_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_tag_multiid);
                $('#host_view_service_table_toolbar .abutton_delete_multiid').on('click', {'dt': dt_host_view_service_table, 'route_name': 'storage.service_delete_multiid_route'}, Sner.storage.action_delete_multiid);
                $('#host_view_service_table_toolbar .abutton_freetag_set_multiid').on('click', {'dt': dt_host_view_service_table, 'route_name': 'storage.service_tag_multiid_route', 'action': 'set'}, Sner.storage.action_freetag_multiid);
                $('#host_view_service_table_toolbar .abutton_freetag_unset_multiid').on('click', {'dt': dt_host_view_service_table, 'route_name': 'storage.service_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_freetag_multiid);
              });
            </script> */}
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
                  <a className="btn btn-outline-secondary abutton_freetag_set_multiid" href="#">
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_VULN_TAGS.map((tag) => (
                    <TagButton tag={tag} key={tag} />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a className="btn btn-outline-secondary abutton_freetag_unset_multiid" href="#">
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
                    <TagsDropdownButton tags={env.VITE_VULN_TAGS} />
                  </div>
                  <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
            {/* <script type="text/javascript">
			var dt_host_view_vuln_table_options = {
				'drawCallback': function (settings) {
					Sner.dt.ajax_options['drawCallback'].call(this, settings); // call parent
					this.find('td.abutton_annotate_dt').on('dblclick', {'dt': this.api(), 'route_name': 'storage.vuln_annotate_route'}, Sner.storage.action_annotate_dt);
				}
			};
			$(document).ready(function() {
				var dt_host_view_vuln_table = Sner.dt.init_datatable('#host_view_vuln_table', dt_host_view_vuln_table_options);
				$('#host_view_vuln_table_toolbar .abutton_selectall').on('click', {'dt': dt_host_view_vuln_table}, Sner.dt.selectall);
				$('#host_view_vuln_table_toolbar .abutton_selectnone').on('click', {'dt': dt_host_view_vuln_table}, Sner.dt.selectnone);
				$('#host_view_vuln_table_toolbar .abutton_tag_multiid').on('click', {'dt': dt_host_view_vuln_table, 'route_name': 'storage.vuln_tag_multiid_route', 'action': 'set'}, Sner.storage.action_tag_multiid);
				$('#host_view_vuln_table_toolbar .abutton_untag_multiid').on('click', {'dt': dt_host_view_vuln_table, 'route_name': 'storage.vuln_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_tag_multiid);
				$('#host_view_vuln_table_toolbar .abutton_delete_multiid').on('click', {'dt': dt_host_view_vuln_table, 'route_name': 'storage.vuln_delete_multiid_route'}, Sner.storage.action_delete_multiid);
				$('#host_view_vuln_table_toolbar .abutton_freetag_set_multiid').on('click', {'dt': dt_host_view_vuln_table, 'route_name': 'storage.vuln_tag_multiid_route', 'action': 'set'}, Sner.storage.action_freetag_multiid);
				$('#host_view_vuln_table_toolbar .abutton_freetag_unset_multiid').on('click', {'dt': dt_host_view_vuln_table, 'route_name': 'storage.vuln_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_freetag_multiid);
			});
		</script> */}
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
                  <a className="btn btn-outline-secondary abutton_freetag_set_multiid" href="#">
                    <i className="fas fa-tag"></i>
                  </a>
                  {env.VITE_NOTE_TAGS.map((tag) => (
                    <TagButton tag={tag} key={tag} />
                  ))}
                </div>{' '}
                <div className="btn-group">
                  <a className="btn btn-outline-secondary abutton_freetag_unset_multiid" href="#">
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
                    <TagsDropdownButton tags={env.VITE_NOTE_TAGS} />
                  </div>
                  <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
            {/* <script type="text/javascript">
			var dt_host_view_note_table_options = {
				'ajax': {'url': "{{ url_for('storage.note_list_json_route', filter='Host.id=="%d"'|format(host.id)) }}", 'method': 'POST'},
				'columns': [
					Sner.dt.column_select({'visible': toolboxesVisible}),
					Sner.dt.column('id', {'visible': false}),
					Sner.dt.column('host_id', {'visible': false}),
					Sner.dt.column('host_address', {'visible': false}),
					Sner.dt.column('host_hostname', {'visible': false}),
					Sner.dt.column('service', {
						'className': 'service_endpoint_dropdown',
						'render': function(data, type, row, meta) {
							return Sner.storage.hbs.service_endpoint_dropdown({...row, 'value': row['service']});
						}
					}),
					Sner.dt.column('via_target', {'visible': JSON.parse(sessionStorage.getItem('dt_viatarget_column_visible'))}),
					Sner.dt.column('xtype'),
					Sner.dt.column('data', {
						'className': 'forcewrap',
						'render': $.fn.dataTable.render.ellipsis({{ config['SNER_TRIM_NOTE_LIST_DATA'] }}, false, true)
					}),
					Sner.dt.column('tags', {'className': 'abutton_annotate_dt', 'render': function(data, type, row, meta) {return Sner.storage.hbs.tag_labels(row);}}),
					Sner.dt.column('comment', {'className': 'abutton_annotate_dt forcewrap', 'title': 'cmnt'}),
					Sner.dt.column_buttons(Sner.storage.hbs.note_controls)
				],
				'select': toolboxesVisible ? {'style': 'multi', 'selector': 'td:first-child'} : false,
				'drawCallback': function (settings) {
					Sner.dt.ajax_options['drawCallback'].call(this, settings); // call parent
					this.find('td.abutton_annotate_dt').on('dblclick', {'dt': this.api(), 'route_name': 'storage.note_annotate_route'}, Sner.storage.action_annotate_dt);
				}
			};
			$(document).ready(function() {
				var dt_host_view_note_table = Sner.dt.init_datatable('#host_view_note_table', dt_host_view_note_table_options);
				$('#host_view_note_table_toolbar .abutton_selectall').on('click', {'dt': dt_host_view_note_table}, Sner.dt.selectall);
				$('#host_view_note_table_toolbar .abutton_selectnone').on('click', {'dt': dt_host_view_note_table}, Sner.dt.selectnone);
				$('#host_view_note_table_toolbar .abutton_tag_multiid').on('click', {'dt': dt_host_view_note_table, 'route_name': 'storage.note_tag_multiid_route', 'action': 'set'}, Sner.storage.action_tag_multiid);
				$('#host_view_note_table_toolbar .abutton_untag_multiid').on('click', {'dt': dt_host_view_note_table, 'route_name': 'storage.note_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_tag_multiid);
				$('#host_view_note_table_toolbar .abutton_delete_multiid').on('click', {'dt': dt_host_view_note_table, 'route_name': 'storage.note_delete_multiid_route'}, Sner.storage.action_delete_multiid);
				$('#host_view_note_table_toolbar .abutton_freetag_set_multiid').on('click', {'dt': dt_host_view_note_table, 'route_name': 'storage.note_tag_multiid_route', 'action': 'set'}, Sner.storage.action_freetag_multiid);
				$('#host_view_note_table_toolbar .abutton_freetag_unset_multiid').on('click', {'dt': dt_host_view_note_table, 'route_name': 'storage.note_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_freetag_multiid);
			});
		</script> */}
          </div>
        </>
      </div>
    </div>
  )
}
export default HostViewPage
