import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import EditButton from '@/components/buttons/EditButton'

const ProfilePage = () => {
  const profile = useLoaderData() as Profile
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const [newApikey, setNewApikey] = useState<string>('')
  const [hasApikey, setHasApikey] = useState<boolean>(profile.has_apikey)

  const columns = [
    Column('id', { visible: false }),
    Column('name'),
    Column('registered'),
    ColumnButtons({
      createdCell: (cell, _data: string, row: { id: number }) => {
        renderElements(
          cell,
          <ButtonGroup>
            <EditButton url={`/auth/profile/webauthn/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={`/auth/profile/webauthn/delete/${row['id']}`} tableId="profile_webauthn_table" />
          </ButtonGroup>,
        )
      },
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>User profile - sner4</title>
      </Helmet>

      <Heading headings={['User profile']} />
      <table className="table table-sm auth-user-profile">
        <tbody>
          <tr>
            <th>username</th>
            <td>
              {profile.username}{' '}
              <Link className="btn btn-outline-secondary" to="/auth/profile/changepassword">
                Change password
              </Link>
            </td>
          </tr>

          <tr>
            <th>email</th>
            <td>{profile.email ?? 'None'}</td>
          </tr>

          <tr>
            <th>2fa authentication</th>
            <td>
              {profile.has_totp ? 'Enabled' : 'Disabled'}{' '}
              <Link className="btn btn-outline-secondary" to="/auth/profile/totp">
                {profile.has_totp ? 'Disable' : 'Enable'}
              </Link>
            </td>
          </tr>

          <tr>
            <th>webauthn credentials</th>
            <td>
              <div id="profile_webauthn_table_toolbar" className="dt_toolbar">
                <Link className="btn btn-outline-secondary" to="/auth/profile/webauthn/register">
                  Register new
                </Link>
              </div>
              <DataTable
                id="profile_webauthn_table"
                ajax={{
                  url: urlFor('/backend/auth/profile/webauthn/list.json'),
                  type: 'POST',
                  xhrFields: { withCredentials: true },
                  beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
                }}
                columns={columns}
                ordering={false}
                paging={false}
                info={false}
                searching={false}
              />
            </td>
          </tr>

          <tr>
            <th>apikey</th>
            <td>
              <form className="form-inline" style={{ display: 'inline' }} method="post">
                <button
                  className="btn btn-outline-secondary"
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault()
                    httpClient
                      .post<{ apikey: string }>(urlFor('/backend/auth/profile/apikey/generate'))
                      .then((resp) => {
                        setNewApikey(resp.data.apikey)
                        setHasApikey(true)
                      })
                      .catch(() => toast.error('Error while generating a new apikey.'))
                  }}
                >
                  Generate
                </button>{' '}
              </form>

              {hasApikey && (
                <>
                  <form className="form-inline" style={{ display: 'inline' }} method="post">
                    <button
                      className="btn btn-outline-secondary"
                      type="submit"
                      onClick={(e) => {
                        e.preventDefault()
                        httpClient
                          .post<{ message: string }>(urlFor('/backend/auth/profile/apikey/revoke'))
                          .then((resp) => {
                            setNewApikey('')
                            setHasApikey(false)
                            toast.success(resp.data.message)
                          })
                          .catch(() => toast.error('Error while revoking the apikey.'))
                      }}
                    >
                      Revoke
                    </button>{' '}
                  </form>
                  <span className="badge badge-info">apikey set</span>
                </>
              )}
              {newApikey && <div className="alert alert-warning mt-1">new apikey {newApikey}</div>}
            </td>
          </tr>
          <tr>
            <th>api_networks</th>
            <td>{profile.api_networks.join(', ')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
export default ProfilePage
