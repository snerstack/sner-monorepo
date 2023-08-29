import env from 'app-env'
import { useNavigate } from 'react-router-dom'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'

import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'

const UserListPage = () => {
  const navigate = useNavigate()

  const columns = [
    Column('id'),
    Column('username'),
    Column('email'),
    Column('apikey', {
      reatedCell: (cell, data, row) =>
        renderElements(
          cell,
          <>
            {row['apikey']}{' '}
            <a
              className="btn btn-outline-secondary btn-sm abutton_userapikey"
              data-url={`/auth/user/apikey/${row['id']}/${row['apikey'] ? 'revoke' : 'generate'}`}
            >
              {row['apikey'] ? 'revoke' : 'generate'}
            </a>
          </>,
        ),
    }),
    Column('roles'),
    Column('active'),
    ColumnButtons({
      createdCell: (cell, data, row) =>
        renderElements(
          cell,
          <ButtonGroup>
            <EditButton url={`/auth/user/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={`/auth/user/delete/${row['id']}`} />
          </ButtonGroup>,
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
        id="user_list_table"
        columns={columns}
        ajax={{
          url: env.VITE_SERVER_URL + '/auth/user/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
      />
    </div>
  )
}
export default UserListPage
