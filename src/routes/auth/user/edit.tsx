import { useState } from 'react'

import BooleanField from '@/components/Fields/BooleanField'
import MultiCheckboxField from '@/components/Fields/MultiCheckboxField'
import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const UserEditPage = () => {
  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [options, setOptions] = useState<{ name: string; checked: boolean }[]>([
    { name: 'admin', checked: false },
    { name: 'agent', checked: false },
    { name: 'operator', checked: false },
    { name: 'user', checked: false },
  ])
  const [active, setActive] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [apiNetworks, setApiNetworks] = useState<string>('')

  const editUserHandler = () => {}

  return (
    <div>
      <Heading headings={['Users', 'Edit']} />
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
        <MultiCheckboxField name="roles" label="Roles" _state={options} _setState={setOptions} />
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
