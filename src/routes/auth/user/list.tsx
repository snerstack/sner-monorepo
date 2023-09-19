import env from 'app-env'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'

import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'

const UserListPage = () => {
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const columns = [
    Column('id'),
    Column('username'),
    Column('email'),
    Column('apikey', {
      createdCell: (cell, _data: string, row: UserListRow) => {
        console.log(row)
        renderElements(
          cell,
          <>
            {row['apikey'] ? 'true' : 'false'}{' '}
            <a
              className="btn btn-outline-secondary btn-sm abutton_userapikey"
              data-url={`/auth/user/apikey/${row['id']}/${row['apikey'] ? 'revoke' : 'generate'}`}
            >
              {row['apikey'] ? 'revoke' : 'generate'}
            </a>
          </>,
        )
      },
    }),
    Column('roles'),
    Column('active'),
    ColumnButtons({
      createdCell: (cell, _data: string, row: UserListRow) =>
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
      <Helmet>
        <title>Users / List - sner4</title>
      </Helmet>
      <Heading headings={['Users']}>
        <div className="breadcrumb-buttons pl-2">
          <Link className="btn btn-outline-primary" to="/auth/user/add">
            Add
          </Link>
        </div>
      </Heading>

      <DataTable
        id="user_list_table"
        columns={columns}
        ajax={{
          url: env.VITE_SERVER_URL + '/auth/user/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />
    </div>
  )
}
export default UserListPage
