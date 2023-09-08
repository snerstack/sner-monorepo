import env from 'app-env'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import BooleanField from '@/components/Fields/BooleanField'
import MultiCheckboxField from '@/components/Fields/MultiCheckboxField'
import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const UserAddPage = () => {
  const navigate = useNavigate()

  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [roles, setRoles] = useState<{ name: string; checked: boolean }[]>([
    { name: 'admin', checked: false },
    { name: 'agent', checked: false },
    { name: 'operator', checked: false },
    { name: 'user', checked: false },
  ])
  const [active, setActive] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [apiNetworks, setApiNetworks] = useState<string>('')

  const addUserHandler = async () => {
    if (username === '') return

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
      const resp = await httpClient.post<{ message: string }>(env.VITE_SERVER_URL + '/auth/user/add', formData)

      toast.success(resp.data.message)
      navigate('/auth/user/list')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <Heading headings={['Users', 'Add']} />
      <form id="login_form" method="post">
        {/* {{ form.csrf_token }}*/}
        {/* <input id="csrf_token" name="csrf_token" type="hidden" value="random-csrf-value-4654654" /> */}
        <TextField
          name="username"
          label="Username"
          placeholder="Username"
          required={true}
          _state={username}
          _setState={setUsername}
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
        <SubmitField name="Add" handler={addUserHandler} />
      </form>
    </div>
  )
}
export default UserAddPage
