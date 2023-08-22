import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DropdownButton from '@/components/Buttons/DropdownButton'
import EditButton from '@/components/Buttons/EditButton'
import MultiCopyButton from '@/components/Buttons/MultiCopyButton'
import TagButton from '@/components/Buttons/TagButton'
import TagsDropdownButton from '@/components/Buttons/TagsDropdownButton'
import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import { Column, ColumnButtons, ColumnSelect } from '@/lib/DataTables'
import { getColorForSeverity, getColorForTag, getTextForRef, getUrlForRef } from '@/lib/sner/storage'
import { renderToString } from 'react-dom/server'
import { Link, useSearchParams } from 'react-router-dom'

const VulnListPage = () => {
  const [searchParams] = useSearchParams()

  const columns = [
    ColumnSelect({ visible: JSON.parse(sessionStorage.getItem('dt_toolboxes_visible')) }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      render: (data, type, row, meta) => {
        return `<a href="/storage/host/view/${row['id']}">${row['host_address']}</a>`
      },
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service'),
    Column('via_target', { visible: JSON.parse(sessionStorage.getItem('dt_viatarget_column_visible')) }),
    Column('name', {
      render: (data, type, row, meta) => {
        return `<a href="/vuln/view/${row['id']}">${row['name']}</a>`
      },
    }),
    Column('xtype', { visible: false }),
    Column('severity', {
      render: (data, type, row, meta) => {
        return `<span class="badge ${getColorForSeverity(row['severity'])}">${row['severity']}</span> `
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
  return (
    <div>
      <Heading headings={['Vulns']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-primary" href="/storage/vuln/report">
            Report
          </a>{' '}
          <a className="btn btn-outline-primary" href="/storage/vuln/report?group_by_host=True">
            Report by host
          </a>{' '}
          <a className="btn btn-outline-primary" href="/storage/vuln/export">
            Export
          </a>{' '}
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="vuln_list_table_toolbar" className="dt_toolbar">
        <div id="vuln_list_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
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
            <a className="btn btn-outline-secondary abutton_freetag_set_multiid" href="#">
              <i className="fas fa-tag"></i>
            </a>
            {['info', 'report', 'report:data', 'todo', 'falsepositive'].map((tag) => (
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
              <TagsDropdownButton tags={['info', 'report', 'report:data', 'todo', 'falsepositive']} />
            </div>
            <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
        columns={columns}
        ajax={{
          url:
            import.meta.env.VITE_SERVER_URL +
            '/storage/vuln/list.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
        order={[1, 'asc']}
        select={
          JSON.parse(sessionStorage.getItem('dt_toolboxes_visible'))
            ? { style: 'multi', selector: 'td:first-child' }
            : false
        }
      />
    </div>
  )
}
export default VulnListPage
