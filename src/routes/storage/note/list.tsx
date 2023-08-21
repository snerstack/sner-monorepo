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
import { Column, ColumnButtons, ColumnSelect } from '@/lib/DataTables'
import { getColorForTag, getLinksForService } from '@/lib/sner/storage'
import { escapeHtml } from '@/utils'
import { renderToString } from 'react-dom/server'
import { Link, useSearchParams } from 'react-router-dom'

const NoteListPage = () => {
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
    Column('xtype'),
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
      <Heading headings={['Notes']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="note_list_table_toolbar" className="dt_toolbar">
        <div id="note_list_table_toolbox" className="dt_toolbar_toolbox">
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
            {['reviewed', 'todo'].map((tag) => (
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
              <TagsDropdownButton tags={['reviewed', 'todo']} />
            </div>
            <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
        columns={columns}
        ajax={{
          url:
            'http://localhost:18000/storage/note/list.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
          type: 'POST',
        }}
        select={
          JSON.parse(sessionStorage.getItem('dt_toolboxes_visible'))
            ? { style: 'multi', selector: 'td:first-child' }
            : false
        }
      />
    </div>
  )
}
export default NoteListPage
