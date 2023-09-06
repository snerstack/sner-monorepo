import env from 'app-env'
import { useState } from 'react'
import { Link, useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'

const ProfilePage = () => {
  const profile = useLoaderData() as Profile
  const navigate = useNavigate()

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
            <EditButton url={`auth/profile/webauthn/edit/${row['id']}`} navigate={navigate} />
            <DeleteButton url={`auth/profile/webauthn/delete/${row['id']}`} />
          </ButtonGroup>,
        )
      },
    }),
  ]

  return (
    <div>
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
              {/* tfa_state = ['disabled', 'Enable'] or tfa_state = ['enabled', 'Disable'] */}
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
                <a className="btn btn-outline-secondary" href="{{ url_for('auth.profile_webauthn_register_route') }}">
                  Register new
                </a>
              </div>
              <DataTable
                id="profile_webauthn_table"
                ajax={{
                  url: env.VITE_SERVER_URL + 'auth/profile/webauthn/list.json',
                  type: 'POST',
                  xhrFields: { withCredentials: true },
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
                      .post<{ apikey: string }>(env.VITE_SERVER_URL + '/auth/profile/apikey/generate')
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
                          .post<{ apikey: string }>(env.VITE_SERVER_URL + '/auth/profile/apikey/revoke')
                          .then(() => {
                            setNewApikey('')
                            setHasApikey(false)
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
