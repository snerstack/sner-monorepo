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
import { Column, ColumnButtons, ColumnSelect } from '@/lib/DataTables'
import { getColorForTag } from '@/lib/sner/storage'
import { renderToString } from 'react-dom/server'
import { Link, useSearchParams } from 'react-router-dom'

const ServiceListPage = () => {
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
    Column('proto'),
    Column('port'),
    Column('name'),
    Column('state'),
    Column('info'),
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
              Button({ name: '+V', title: 'Add vuln', url: `/storage/vuln/add/service/${row['id']}` }),
              Button({ name: '+N', title: 'Add note', url: `/storage/note/add/service/${row['id']}` }),
              EditButton({ url: `/storage/service/edit/${row['id']}` }),
              DeleteButton({ url: `/storage/service/delete/${row['id']}` }),
            ],
          }),
        ),
    }),
  ]

  return (
    <div>
      <Heading headings={['Services']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="service_list_table_toolbar" className="dt_toolbar">
        <div id="service_list_table_toolbox" className="dt_toolbar_toolbox">
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
        columns={columns}
        ajax={{
          url:
            import.meta.env.VITE_SERVER_URL +
            '/storage/service/list.json' +
            (searchParams.has('filter') ? `?filter=${searchParams.get('filter')}` : ''),
          type: 'POST',
          xhrFields: { withCredentials: true },
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
export default ServiceListPage
