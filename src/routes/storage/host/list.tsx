import env from 'app-env'
import clsx from 'clsx'
import { renderToString } from 'react-dom/server'
import { Link, useSearchParams } from 'react-router-dom'
import { useSessionStorage } from 'react-use'
import { useRecoilState } from 'recoil'

import { modalState } from '@/atoms/modalAtom'

import { Column, ColumnButtons, ColumnSelect, getTableApi } from '@/lib/DataTables'
import { deleteRow, getColorForTag, tagAction } from '@/lib/sner/storage'

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
import Modal from '@/components/Modal'

const HostListPage = () => {
  const [searchParams] = useSearchParams()
  const [_, setShow] = useRecoilState(modalState)
  const [toolboxesVisible] = useSessionStorage('dt_toolboxes_visible')

  const columns = [
    ColumnSelect({ visible: toolboxesVisible }),
    Column('id', { visible: false }),
    Column('address', {
      render: (data, type, row, meta) => {
        return `<a href="/storage/host/view/${row['id']}">${row['address']}</a>`
      },
    }),
    Column('hostname'),
    Column('os'),
    Column('cnt_s'),
    Column('cnt_v'),
    Column('cnt_n'),
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
                ],
              }),
              Button({ name: '+S', title: 'Add service', url: `/storage/service/add/${row['id']}` }),
              Button({ name: '+V', title: 'Add vuln', url: `/storage/vuln/add/host/${row['id']}` }),
              Button({ name: '+N', title: 'Add note', url: `/storage/note/add/host/${row['id']}` }),
              EditButton({ url: `/storage/host/edit/${row['id']}` }),
              DeleteButton({ url: `/storage/host/delete/${row['id']}` }),
            ],
          }),
        ),
    }),
  ]

  const dt = getTableApi('host_list_table')

  document.querySelector('.abutton_selectall')?.addEventListener('click', () => dt.rows({ page: 'current' }).select())
  document
    .querySelector('.abutton_selectnone')
    ?.addEventListener('click', () => dt.rows({ page: 'current' }).deselect())
  document
    .querySelectorAll('.abutton_tag_multiid')
    .forEach((tag) => tag.addEventListener('click', () => tagAction(dt, tag, '/storage/host/tag_multiid', 'set')))
  document
    .querySelectorAll('.abutton_untag_multiid')
    .forEach((tag) => tag.addEventListener('click', () => tagAction(dt, tag, '/storage/host/tag_multiid', 'unset')))
  document
    .querySelector('.abutton_delete_multiid')
    ?.addEventListener('click', () => deleteRow(dt, '/storage/host/delete_multiid'))
  // $('#host_list_table_toolbar .abutton_freetag_set_multiid').on('click', {'dt': dt_host_list_table, 'route_name': 'storage.host_tag_multiid_route', 'action': 'set'}, Sner.storage.action_freetag_multiid);
  //   $('#host_list_table_toolbar .abutton_freetag_unset_multiid').on('click', {'dt': dt_host_list_table, 'route_name': 'storage.host_tag_multiid_route', 'action': 'unset'}, Sner.storage.action_freetag_multiid);

  document.querySelectorAll('td.abutton_annotate_dt').forEach((element) => {
    element.addEventListener('click', (e) => {
      setShow(true)
    })
  })

  return (
    <div>
      <Heading headings={['Hosts']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-primary" href="/storage/host/add">
            Add
          </a>{' '}
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="host_list_table_toolbar" className="dt_toolbar">
        <div id="host_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible && 'collapse')}>
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
            {env.VITE_HOST_TAGS.map((tag) => (
              <TagButton tag={tag} key={tag} />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary abutton_freetag_unset_multiid text-secondary">
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
              <TagsDropdownButton tags={env.VITE_HOST_TAGS} />
            </div>
            <a className="btn btn-outline-secondary abutton_delete_multiid" href="#">
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
      <Modal title="Annotate">
        <></>
      </Modal>
    </div>
  )
}
export default HostListPage
