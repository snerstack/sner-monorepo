import { useState } from 'react'
import { useRecoilState } from 'recoil'
import { userState } from '@/atoms/userAtom'
import httpClient from '@/lib/httpClient'
import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
  const [_, setUser] = useRecoilState(userState)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const navigation = useNavigate()

  const loginHandler = async () => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    try {
      const resp = await httpClient.post(import.meta.env.VITE_SERVER_URL + '/auth/login', formData)

      setUser({ ...resp.data, isAuthenticated: true })

      navigation('/')
    } catch (err) {}
  }

  return (
    <div>
      <Heading headings={['Login']} />
      <form id="login_form" method="post">
        {/* {{ form.csrf_token }}*/}
        {/* <input id="csrf_token" name="csrf_token" type="hidden" value=""" /> */}
        <TextField
          name="username"
          label="Username"
          placeholder="Username"
          horizontal={true}
          required={true}
          _state={username}
          _setState={setUsername}
        />
        <PasswordField
          name="password"
          label="Password"
          placeholder="Password"
          horizontal={true}
          required={true}
          _state={password}
          _setState={setPassword}
        />
        <SubmitField name="Login" horizontal={true} handler={loginHandler} />
        {/* {oauth_enabled && ( */}
        {false && (
          <div className="form-group row">
            <div className="col-sm-10 offset-sm-2">
              <a className="btn btn-primary" href="{{ url_for('auth.login_oidc_route') }}">
                OIDC
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
export default LoginPage
