import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const LoginPage = () => {
  const navigate = useNavigate()
  const [, setUser] = useRecoilState(userState)

  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const loginHandler = async () => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    try {
      const resp = await httpClient.post<User | { totp_login_required: boolean } | { webauthn_login: boolean }>(
        import.meta.env.VITE_SERVER_URL + '/auth/login',
        formData,
      )

      if ('totp_login_required' in resp.data) {
        navigate('/auth/login_totp')
        return
      }

      if ('webauthn_login' in resp.data) {
        navigate('/auth/login_webauthn')
        return
      }

      setUser({ ...resp.data, isAuthenticated: true })

      navigate('/')
    } catch (err) {
      toast.warn('Invalid credentials.')
    }
  }

  return (
    <div>
      <Helmet>
        <title>Login - sner4</title>
      </Helmet>
      <Heading headings={['Login']} />
      <form id="login_form" method="post">
        <TextField
          name="username"
          label="Username"
          placeholder="Username"
          required={true}
          _state={username}
          _setState={setUsername}
        />
        <PasswordField
          name="password"
          label="Password"
          placeholder="Password"
          required={true}
          _state={password}
          _setState={setPassword}
        />
        <SubmitField name="Login" handler={loginHandler} />
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
