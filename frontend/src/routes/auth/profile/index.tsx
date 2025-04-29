import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'
import { httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import TagsConfig from '@/components/TagsConfig'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import { EditButton } from '@/components/buttons/BasicButtons'

const ProfilePage = () => {
  const profile = useLoaderData() as Profile
  const navigate = useNavigate()

  const [newApikey, setNewApikey] = useState<string>('')
  const [hasApikey, setHasApikey] = useState<boolean>(profile.has_apikey)

  const handleApikeyGenerate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    httpClient
      .post<{ apikey: string }>(urlFor('/backend/auth/profile/apikey/generate'))
      .then((resp) => {
        setNewApikey(resp.data.apikey)
        setHasApikey(true)
      })
      .catch(() => toast.error('Error while generating a new apikey.'))
  }

  const handleApikeyRevoke = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    httpClient
      .post<{ message: string }>(urlFor('/backend/auth/profile/apikey/revoke'))
      .then((resp) => {
        setNewApikey('')
        setHasApikey(false)
        toast.success(resp.data.message)
      })
      .catch(() => toast.error('Error while revoking the apikey.'))
  }

  const columns = [
    Column('id', { visible: false }),
    Column('name', { title: "Name" }),
    Column('registered', { title: "Registered" }),
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
        <title>User profile - SNER</title>
      </Helmet>

      <Heading headings={['User profile']} />

      <div className="d-flex justify-content-center">
        <table className="table table-sm auth-user-profile w-75">
          <tbody>
            <tr>
              <th className="w-25">Username</th>
              <td className="w-75">
                {profile.username}
                {' '}
                <Link className="btn btn-outline-secondary" to="/auth/profile/changepassword">
                  Change password
                </Link>
              </td>
            </tr>

            <tr>
              <th>Email</th>
              <td>{profile.email}</td>
            </tr>

            <tr>
              <th>Full name</th>
              <td>{profile.full_name}</td>
            </tr>

            <tr>
              <th>2FA authentication</th>
              <td>
                {(() => {
                  /* c8 ignore next 1 */
                  const [caption, action] = profile.has_totp ? ['Enabled', 'Disable'] : ['Disabled', 'Enable']
                  return (<>{caption} <Link className="btn btn-outline-secondary" to="/auth/profile/totp">{action}</Link></>)
                })()}
              </td>
            </tr>

            <tr>
              <th>WebAuthn credentials</th>
              <td>
                <div id="profile_webauthn_table_toolbar" className="dt_toolbar">
                  <Link className="btn btn-outline-secondary" to="/auth/profile/webauthn/register">
                    Register new
                  </Link>
                </div>
                <DataTable
                  id="profile_webauthn_table"
                  ajax_url={urlFor('/backend/auth/profile/webauthn/list.json')}
                  columns={columns}
                  ordering={false}
                  paging={false}
                  info={false}
                  searching={false}
                />
              </td>
            </tr>

            <tr>
              <th>API key</th>
              <td>
                <button className="btn btn-outline-secondary mr-2" type="button" onClick={handleApikeyGenerate}>
                  Generate
                </button>
                {hasApikey && (
                  <>
                    <button className="btn btn-outline-secondary mr-2" type="button" onClick={handleApikeyRevoke}>
                      Revoke
                    </button>
                    <span className="badge badge-info">apikey set</span>
                  </>
                )}
                {newApikey && <div className="alert alert-warning mt-2 p-1">new apikey {newApikey}</div>}
              </td>
            </tr>
            <tr>
              <th>API networks</th>
              <td>{profile.api_networks.join(', ')}</td>
            </tr>
            <tr>
              <th>Tag colors</th>
              <td><TagsConfig /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default ProfilePage
