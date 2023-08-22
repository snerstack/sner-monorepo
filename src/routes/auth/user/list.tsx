import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import { Column, ColumnButtons } from '@/lib/DataTables'
import { renderToString } from 'react-dom/server'

const UserListPage = () => {
  const columns = [
    Column('id'),
    Column('username'),
    Column('email'),
    Column('apikey', {
      render: (data, type, row, meta) =>
        `${row['apikey']} <a class="btn btn-outline-secondary btn-sm abutton_userapikey" data-url="/auth/user/apikey/${
          row['id']
        }/${row['apikey'] ? 'revoke' : 'generate'}">${row['apikey'] ? 'revoke' : 'generate'}</a>`,
    }),
    Column('roles'),
    Column('active'),
    ColumnButtons({
      render: (data, type, row, meta) =>
        renderToString(
          ButtonGroup({
            children: [
              EditButton({ url: `/auth/user/edit/${row['id']}` }),
              DeleteButton({ url: `/auth/user/delete/${row['id']}` }),
            ],
          }),
        ),
    }),
  ]

  return (
    <div>
      <Heading headings={['Users']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-primary" href="/auth/user/add">
            Add
          </a>
        </div>
      </Heading>

      <DataTable
        // drawCallback={(settings) => {}}
        columns={columns}
        ajax={{
          url: import.meta.env.VITE_SERVER_URL + '/auth/user/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
      />
    </div>
  )
}
export default UserListPage
