import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { userState } from '@/atoms/userAtom'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import PasswordField from '@/components/fields/PasswordField'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

const LoginPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)
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
        urlFor('/backend/auth/login'),
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
      handleHttpClientError(err)
    }
  }

  return (
    <div>
      <Helmet>
        <title>Login - SNER</title>
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

        {appConfig.oidc_enabled && (
          <div className="form-group row">
            <div className="col-sm-10 offset-sm-2">
              <a className="btn btn-primary" href={urlFor('/backend/auth/login_oidc')}>
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
