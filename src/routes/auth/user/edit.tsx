import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import BooleanField from '@/components/Fields/BooleanField'
import MultiCheckboxField from '@/components/Fields/MultiCheckboxField'
import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const UserEditPage = () => {
  const user = useLoaderData() as UserEdit
  const navigate = useNavigate()

  const [username, setUsername] = useState<string>(user.username)
  const [email, setEmail] = useState<string>(user.email || '')
  const [roles, setRoles] = useState<{ name: string; checked: boolean }[]>([
    { name: 'admin', checked: user.roles.includes('admin') },
    { name: 'agent', checked: user.roles.includes('agent') },
    { name: 'operator', checked: user.roles.includes('operator') },
    { name: 'user', checked: user.roles.includes('user') },
  ])
  const [active, setActive] = useState<boolean>(user.active)
  const [password, setPassword] = useState<string>('')
  const [apiNetworks, setApiNetworks] = useState<string>(user.api_networks.join('\n'))

  const [usernameErrors, setUsernameErrors] = useState<string[]>([])

  const editUserHandler = async () => {
    if (username === '') return setUsernameErrors(['Username is required.'])

    const formData = new FormData()
    formData.append('username', username)
    formData.append('email', email)
    formData.append('new_password', password)
    roles.forEach((role) => {
      if (role.checked) {
        formData.append('roles', role.name)
      }
    })
    formData.append('api_networks', apiNetworks)

    try {
      const resp = await httpClient.post<{ message: string }>(
        import.meta.env.VITE_SERVER_URL + `/auth/user/edit/${user.id}`,
        formData,
      )

      toast.success(resp.data.message)
      navigate('/auth/user/list')
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setUsernameErrors([])
  }, [username])

  return (
    <div>
      <Helmet>
        <title>Users / Edit - sner4</title>
      </Helmet>
      <Heading headings={['Users', 'Edit']} />
      <form id="login_form" method="post">
        <TextField
          name="username"
          label="Username"
          placeholder="Username"
          required={true}
          _state={username}
          _setState={setUsername}
          errors={usernameErrors}
        />
        <TextField name="email" label="Email" placeholder="Email" _state={email} _setState={setEmail} />
        <MultiCheckboxField name="roles" label="Roles" _state={roles} _setState={setRoles} />
        <BooleanField name="active" label="Active" _state={active} _setState={setActive} />
        <PasswordField
          name="password"
          label="Password"
          placeholder="Password"
          _state={password}
          _setState={setPassword}
        />
        <TextAreaField
          name="api_networks"
          label="API Networks"
          placeholder="API Networks"
          rows={5}
          _state={apiNetworks}
          _setState={setApiNetworks}
        />
        <SubmitField name="Edit" handler={editUserHandler} />
      </form>
    </div>
  )
}
export default UserEditPage
