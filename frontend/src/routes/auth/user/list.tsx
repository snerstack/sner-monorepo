import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCookie } from 'react-use'
import { useRecoilState } from 'recoil'

import { apikeyModalState } from '@/atoms/apikeyModalAtom'

import { Column, ColumnButtons, getTableApi, renderElements } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import EditButton from '@/components/buttons/EditButton'
import ApikeyModal from '@/components/modals/ApikeyModal'

const UserListPage = () => {
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')
  const [, setApikeyModal] = useRecoilState(apikeyModalState)

  const columns = [
    Column('id'),
    Column('username'),
    Column('email'),
    Column('apikey', {
      createdCell: (cell, _data: string, row: UserListRow) => {
        renderElements(
          cell,
          <>
            {row['apikey'] ? 'true' : 'false'}{' '}
            <a
              data-testid="apikey-btn"
              className="btn btn-outline-secondary btn-sm"
              onClick={(e) => {
                e.preventDefault()
                httpClient
                  .post<{ apikey?: string; message?: string }>(
                    `${import.meta.env.VITE_SERVER_URL}/auth/user/apikey/${row['id']}/${
                      row['apikey'] ? 'revoke' : 'generate'
                    }`,
                  )
                  .then((res) => {
                    if (res.data.apikey) {
                      setApikeyModal({ show: true, apikey: res.data.apikey })
                    } else {
                      toast.success(res.data.message)
                    }

                    getTableApi('user_list_table').draw()
                  })
                  .catch(() => {
                    toast.error('Server error.')
                  })
              }}
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
            <DeleteButton url={`/auth/user/delete/${row['id']}`} tableId="user_list_table" />
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
          url: import.meta.env.VITE_SERVER_URL + '/auth/user/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />

      <ApikeyModal />
    </div>
  )
}
export default UserListPage
